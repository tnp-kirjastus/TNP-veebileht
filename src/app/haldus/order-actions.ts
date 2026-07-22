"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { roundEuro } from "@/lib/money";
import { sendOrderStatusUpdate, sendOrderShippedEmail } from "@/lib/email";

const ORDER_STATUSES = [
  "pending", "payment_pending", "paid", "processing", "shipped", "delivered",
  "cancelled", "payment_failed", "expired", "manual_review", "refunded", "preorder",
] as const;

const TIMESTAMP_FIELDS: Record<string, string> = {
  paid: "paid_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

const allStatuses = [...ORDER_STATUSES, "delivered"];

const VALID_TRANSITIONS: Record<string, string[]> = Object.fromEntries(
  allStatuses.map((s) => [s, allStatuses.filter((t) => t !== s)]),
) as Record<string, string[]>;

const deleteOrdersSchema = z.object({
  ids: z.string().min(1),
});

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  title: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).max(99),
});

const createOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120).refine((v) => v.includes(" "), "Sisesta ees- ja perekonnanimi"),
  customer_email: z.string().email().trim().max(320),
  customer_phone: z.string().trim().min(5).max(40),
  shipping_address: z.string().trim().min(2).max(500),
  shipping_method: z.string().min(1),
  shipping_cost: z.number().min(0),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  status: z.enum(ORDER_STATUSES),
  vat_amount: z.number().min(0),
  vat_percent: z.number().min(0).max(100),
  items: z.array(orderItemSchema).max(99),
});

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
  sendEmail: z.boolean().optional(),
});

const shipOrderSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
  trackingUrl: z.string().optional(),
});

export async function deleteOrders(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const session = await requireAdminSession(["admin"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = deleteOrdersSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli sisendit." };

  const idList = parsed.data.ids.split(",").map((s) => s.trim()).filter(Boolean);
  if (idList.length === 0) return { error: "Vali üks või enam tellimust." };

  const db = createAdminClient();

  const { error } = await db.schema("commerce").from("orders")
    .delete({ count: "exact" })
    .in("id", idList);

  if (error) {
    console.error("deleteOrders error:", error);
    return { error: "Kustutamine ebaõnnestus. Proovi uuesti." };
  }

  for (const id of idList) {
    await audit(session.user.id, "order.deleted", "order", id);
  }

  revalidatePath("/haldus/tellimused");
  return { success: true };
}

export async function createOrder(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);

  const raw = formData.get("order");
  if (typeof raw !== "string") return { error: "Puuduvad andmed." };

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch { return { error: "Vigane JSON." }; }

  const parsed = createOrderSchema.safeParse(parsedJson);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };

  const db = createAdminClient();

  const orderNumber = `TNP-${new Date().getFullYear()}-D${Date.now().toString(36).toUpperCase()}`;
  const confirmationToken = randomBytes(32).toString("hex");

  const { data: order, error: insertError } = await db.schema("commerce").from("orders")
    .insert({
      order_number: orderNumber,
      status: parsed.data.status,
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email,
      customer_phone: parsed.data.customer_phone,
      shipping_address: parsed.data.shipping_address,
      shipping_method: parsed.data.shipping_method,
      shipping_cost: roundEuro(parsed.data.shipping_cost),
      subtotal: roundEuro(parsed.data.subtotal),
      total: roundEuro(parsed.data.total),
      vat_amount: roundEuro(parsed.data.vat_amount),
      vat_percent: parsed.data.vat_percent,
      currency: "EUR",
      confirmation_token: confirmationToken,
    })
    .select("id")
    .single();

  if (insertError || !order) {
    console.error("createOrder insert error:", insertError);
    return { error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." };
  }

  const orderItems = parsed.data.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    title: item.title,
    price: roundEuro(item.price),
    quantity: item.quantity,
  }));

  const { error: itemsError } = await db.schema("commerce").from("order_items").insert(orderItems);
  if (itemsError) {
    console.error("createOrder items error:", itemsError);
    return { error: "Tellimuse ridade lisamine ebaõnnestus. Proovi uuesti." };
  }

  await audit(session.user.id, "order.created", "order", order.id, {
    after: { orderNumber, customer: parsed.data.customer_name, total: parsed.data.total, items: parsed.data.items.length },
  });

  revalidatePath("/haldus/tellimused");
  return { success: true };
}

export async function updateOrderStatus(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const session = await requireAdminSession(["editor", "admin"]);

  const raw = formData.get("data");
  if (typeof raw !== "string") return { error: "Puuduvad andmed." };

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch { return { error: "Vigane JSON." }; }

  const parsed = updateStatusSchema.safeParse(parsedJson);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli sisendit." };

  const db = createAdminClient();

  const { data: order, error: orderErr } = await db.schema("commerce").from("orders")
    .select("id, order_number, status, customer_name, customer_email")
    .eq("id", parsed.data.orderId)
    .single<{ id: string; order_number: string; status: string; customer_name: string; customer_email: string }>();

  if (orderErr || !order) {
    return { error: "Tellimust ei leitud." };
  }

  if (order.status === parsed.data.status) {
    return { success: true };
  }

  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return { error: `Staatuse üleminek "${order.status}" → "${parsed.data.status}" ei ole lubatud.` };
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: now,
  };

  if (TIMESTAMP_FIELDS[parsed.data.status]) {
    updates[TIMESTAMP_FIELDS[parsed.data.status]] = now;
  }

  const { error: updateErr } = await db.schema("commerce").from("orders")
    .update(updates)
    .eq("id", parsed.data.orderId);

  if (updateErr) {
    console.error("updateOrderStatus error:", updateErr);
    return { error: "Staatuse muutmine ebaõnnestus. Proovi uuesti." };
  }

  await db.schema("commerce").from("order_status_history").insert({
    order_id: parsed.data.orderId,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    changed_by: session.user.id,
  });

  let emailError: string | undefined;
  const sendEmail = parsed.data.sendEmail !== false;
  if (sendEmail && order.customer_email) {
    const emailResult = await sendOrderStatusUpdate({
      orderId: order.id,
      orderNumber: order.order_number,
      newStatus: parsed.data.status,
      to: order.customer_email,
      customerName: order.customer_name ?? null,
      note: parsed.data.note,
    });
    if (!emailResult.success && emailResult.error) {
      emailError = emailResult.error;
      console.error("status_update_email_error", emailResult.error);
    }
  }

  await audit(session.user.id, "order.status_changed", "order", parsed.data.orderId, {
    before: { status: order.status },
    after: { status: parsed.data.status, note: parsed.data.note ?? null },
  });

  revalidatePath(`/haldus/tellimused/${parsed.data.orderId}`);
  revalidatePath("/haldus/tellimused");
  return { success: true, emailError };
}

export async function shipOrder(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const session = await requireAdminSession(["editor", "admin"]);

  const raw = formData.get("data");
  if (typeof raw !== "string") return { error: "Puuduvad andmed." };

  let parsedJson: unknown;
  try { parsedJson = JSON.parse(raw); } catch { return { error: "Vigane JSON." }; }

  const parsed = shipOrderSchema.safeParse(parsedJson);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli sisendit." };

  const db = createAdminClient();

  const { data: order, error: orderErr } = await db.schema("commerce").from("orders")
    .select("id, order_number, status, customer_name, customer_email")
    .eq("id", parsed.data.orderId)
    .single<{ id: string; order_number: string; status: string; customer_name: string; customer_email: string }>();

  if (orderErr || !order) {
    return { error: "Tellimust ei leitud." };
  }

  if (order.status !== "paid") {
    return { error: `Saata saab ainult makstud tellimusi (praegune: ${order.status}).` };
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await db.schema("commerce").from("orders")
    .update({
      status: "shipped",
      shipped_at: now,
      shipping_carrier: parsed.data.carrier,
      tracking_code: parsed.data.trackingNumber,
      updated_at: now,
    })
    .eq("id", parsed.data.orderId);

  if (updateErr) {
    console.error("shipOrder update error:", updateErr);
    return { error: "Saatmine ebaõnnestus. Proovi uuesti." };
  }

  await db.schema("commerce").from("order_status_history").insert({
    order_id: parsed.data.orderId,
    status: "shipped",
    note: `Saadetud · ${parsed.data.carrier} · ${parsed.data.trackingNumber}`,
    changed_by: session.user.id,
  });

  let emailError: string | undefined;
  if (order.customer_email) {
    const emailResult = await sendOrderShippedEmail({
      orderId: order.id,
      orderNumber: order.order_number,
      to: order.customer_email,
      customerName: order.customer_name ?? order.customer_email.split("@")[0],
      carrier: parsed.data.carrier,
      trackingNumber: parsed.data.trackingNumber,
      trackingUrl: parsed.data.trackingUrl,
    });
    if (!emailResult.success && emailResult.error) {
      emailError = emailResult.error;
      console.error("shipped_email_error", emailResult.error);
    }
  }

  await audit(session.user.id, "order.shipped", "order", parsed.data.orderId, {
    after: { carrier: parsed.data.carrier, tracking: parsed.data.trackingNumber },
  });

  revalidatePath(`/haldus/tellimused/${parsed.data.orderId}`);
  revalidatePath("/haldus/tellimused");
  return { success: true, emailError };
}
