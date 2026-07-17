import "server-only";

import { Resend } from "resend";
import { serverEnv } from "./env";
import { createAdminClient } from "./supabase/admin";
<<<<<<< HEAD
import { getStoreSettings } from "@/lib/settings";
import {
  statusSubject,
  buildStatusUpdateHtml,
  buildNewOrderAdminHtml,
  buildOrderShippedHtml,
} from "@/lib/email-templates";

const DEFAULT_FROM = "Kirjastus Tänapäev <tellimused@tnp.ee>";

async function getFromAddress(): Promise<string> {
  const settings = await getStoreSettings();
  return settings.email.fromAddress || DEFAULT_FROM;
}

export async function isNotifEnabled(statusKey: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data } = await db.schema("content").from("settings")
      .select("email")
      .eq("key", "store")
      .maybeSingle();
    if (!data) return true;
    const email = (data.email as Record<string, unknown> | null);
    const notifications = (email?.notifications as Record<string, boolean> | null);
    if (!notifications) return true;
    if (notifications[statusKey] !== undefined) return notifications[statusKey];
    return true;
  } catch {
    return true;
  }
}
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

export async function sendOrderConfirmationEmail(params: {
  orderId: string;
  orderNumber: string;
  to: string;
  customerName: string;
  total: number;
  items: Array<{ title: string; quantity: number; price: number }>;
}) {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping confirmation email");
    return;
  }

<<<<<<< HEAD
  const settings = await getStoreSettings();
  const fromAddress = settings.email.fromAddress || DEFAULT_FROM;
  const subject = settings.email.orderSubject.replace("{{orderNumber}}", params.orderNumber);
  const itemLines = params.items.map(
    (item) => `${item.quantity} x ${item.title} — ${item.price.toFixed(2)} €`
  ).join("\n");
  const body = settings.email.orderBody
    .replace("{{customerName}}", params.customerName)
    .replace("{{orderNumber}}", params.orderNumber)
    .replace("{{total}}", params.total.toFixed(2))
    .replace("{{itemLines}}", itemLines);

  const db = createAdminClient();

  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: "email.order_confirmation",
      payload: {
        order_id: params.orderId,
        order_number: params.orderNumber,
        customer_email: params.to,
        customer_name: params.customerName,
        total: params.total,
        items: params.items,
        provider: "resend",
        template: "order_confirmation",
      },
=======
  const db = createAdminClient();

  const outboxPayload = {
    order_id: params.orderId,
    order_number: params.orderNumber,
    customer_email: params.to,
    customer_name: params.customerName,
    total: params.total,
    items: params.items,
    provider: "resend",
    template: "order_confirmation",
  };

  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: "email.order_confirmation",
      payload: outboxPayload,
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
    })
    .select("id")
    .single();

  if (outboxErr || !outboxRow) {
    console.error("outbox_insert_failed", outboxErr?.message);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

<<<<<<< HEAD
  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      text: body,
=======
  const itemLines = params.items.map(
    (item) => `${item.quantity} x ${item.title} — ${item.price.toFixed(2)} €`
  ).join("\n");

  try {
    await resend.emails.send({
      from: "Kirjastus Tänapäev <tellimused@tnp.ee>",
      to: params.to,
      subject: `Tellimus ${params.orderNumber} kinnitatud`,
      text: `Tere ${params.customerName}!\n\nSinu tellimus nr ${params.orderNumber} summas ${params.total.toFixed(2)} € on kinnitatud.\n\nTellitud raamatud:\n${itemLines}\n\nSaadame raamatud esimesel võimalusel. Tarne kohta saadame eraldi teavituse.\n\nKüsimuste korral kirjuta: tellimused@tnp.ee\n\nKirjastus Tänapäev`,
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
    });

    await db.schema("commerce").from("outbox")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", outboxRow.id);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("confirmation_email_failed", errorMsg);
    await db.schema("commerce").from("outbox")
      .update({ attempts: 1, error_code: errorMsg.slice(0, 500) })
      .eq("id", outboxRow.id);
  }
}
<<<<<<< HEAD

export async function sendOrderStatusUpdate(params: {
  orderId: string;
  orderNumber: string;
  newStatus: string;
  to: string;
  customerName: string | null;
  note?: string;
}) {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return;

  const notifKey = `notify_${params.newStatus}`;
  if (!(await isNotifEnabled(notifKey))) {
    console.log(`Notification ${notifKey} disabled, skipping status update email`);
    return;
  }

  const fromAddress = await getFromAddress();
  const subject = statusSubject(params.newStatus, params.orderNumber);
  const html = buildStatusUpdateHtml({
    orderRef: params.orderNumber,
    customerName: params.customerName,
    newStatus: params.newStatus,
    note: params.note,
  });

  const db = createAdminClient();

  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: "email.status_update",
      payload: {
        order_id: params.orderId,
        order_number: params.orderNumber,
        status: params.newStatus,
        customer_email: params.to,
        customer_name: params.customerName,
        note: params.note ?? null,
        provider: "resend",
        template: "status_update",
      },
    })
    .select("id")
    .single();

  if (outboxErr || !outboxRow) {
    console.error("outbox_insert_failed", outboxErr?.message);
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });

    if (outboxRow) {
      await db.schema("commerce").from("outbox")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", outboxRow.id);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("status_update_email_failed", errorMsg);
    if (outboxRow) {
      await db.schema("commerce").from("outbox")
        .update({ attempts: 1, error_code: errorMsg.slice(0, 500) })
        .eq("id", outboxRow.id);
    }
  }
}

export async function sendOrderShippedEmail(params: {
  orderId: string;
  orderNumber: string;
  to: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}) {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return;

  if (!(await isNotifEnabled("notify_shipped"))) {
    console.log("notify_shipped disabled, skipping shipped email");
    return;
  }

  const fromAddress = await getFromAddress();
  const subject = `${DEFAULT_FROM.split("<")[0].trim()}: Tellimus ${params.orderNumber} on saadetud`;
  const html = buildOrderShippedHtml({
    orderRef: params.orderNumber,
    customerName: params.customerName,
    carrier: params.carrier,
    trackingNumber: params.trackingNumber,
    trackingUrl: params.trackingUrl,
  });

  const db = createAdminClient();

  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: "email.order_shipped",
      payload: {
        order_id: params.orderId,
        order_number: params.orderNumber,
        customer_email: params.to,
        customer_name: params.customerName,
        carrier: params.carrier,
        tracking_number: params.trackingNumber,
        tracking_url: params.trackingUrl ?? null,
        provider: "resend",
        template: "order_shipped",
      },
    })
    .select("id")
    .single();

  if (outboxErr || !outboxRow) {
    console.error("outbox_insert_failed", outboxErr?.message);
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: fromAddress,
      to: params.to,
      subject,
      html,
    });

    if (outboxRow) {
      await db.schema("commerce").from("outbox")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", outboxRow.id);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("shipped_email_failed", errorMsg);
    if (outboxRow) {
      await db.schema("commerce").from("outbox")
        .update({ attempts: 1, error_code: errorMsg.slice(0, 500) })
        .eq("id", outboxRow.id);
    }
  }
}

export async function sendNewOrderAdminEmail(params: {
  orderId: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}) {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return;

  if (!(await isNotifEnabled("notify_pending"))) {
    console.log("notify_pending disabled, skipping new order admin email");
    return;
  }

  const fromAddress = await getFromAddress();
  const subject = `Uus tellimus: ${params.orderNumber}`;
  const html = buildNewOrderAdminHtml({
    orderRef: params.orderNumber,
    total: params.total,
    createdAt: params.createdAt,
    items: params.items,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
  });

  const settings = await getStoreSettings();
  const adminEmail = settings.company.email || "tellimused@tnp.ee";

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject,
      html,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("admin_notification_email_failed", errorMsg);
  }
}
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
