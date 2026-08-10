import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartSession, readCart } from "@/lib/cart-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayment } from "@/lib/payments/maksekeskus";
import { euroDecimalToCents } from "@/lib/money";
import { consumeRateLimit } from "@/lib/rate-limit";
import { fetchParcelMachines } from "@/lib/shipping/maksekeskus-shipping";
import { sendNewOrderAdminEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";

/**
 * Ühtne checkout: kogu tellimuse loogika (laoseis, reservatsioonid, kupong,
 * tarne, käibemaks, ettetellimused) toimub transaktsioonilises RPC-s
 * commerce.checkout_cart. Rakendus valideerib sisendi ja algatab makse.
 */

const parcelMachineSchema = z.object({
  carrier: z.enum(["omniva", "smartpost"]),
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(240),
  city: z.string().trim().max(160),
  address: z.string().trim().max(240),
  zip: z.string().trim().max(20),
}).nullable();

const schema = z.object({
  name: z.string().trim().min(2).max(120).refine((v) => v.includes(" "), "Sisesta ees- ja perekonnanimi"),
  email: z.email().trim().max(320),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(2).max(500),
  shipping_method: z.enum(["omniva", "smartpost"]).default("omniva"),
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({ slug: z.string().min(1).max(240), quantity: z.number().int().min(1).max(99) })).max(99).optional(),
  parcel_machine: parcelMachineSchema,
  invoiceRequested: z.boolean().default(false),
  companyName: z.string().max(200).optional(),
  companyRegCode: z.string().max(50).optional(),
  couponCode: z.string().max(50).optional(),
  create_account: z.boolean().default(false),
  password: z.string().min(6).max(128).optional(),
});

function buildShippingAddress(parsed: z.infer<typeof schema>): string {
  if (parsed.parcel_machine) {
    return `${parsed.parcel_machine.carrier}||${parsed.parcel_machine.id}||${parsed.parcel_machine.name}||${parsed.parcel_machine.address}||${parsed.parcel_machine.city}||${parsed.parcel_machine.zip}`;
  }
  return parsed.address;
}

function notifyAdmin(
  orderId: string,
  orderNumber: string,
  total: number,
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  items: Array<{ title: string; quantity: number; price: number }>,
) {
  sendNewOrderAdminEmail({
    orderId,
    orderNumber,
    total,
    createdAt: new Date().toISOString(),
    customerName,
    customerEmail,
    customerPhone,
    items: items.map((i) => ({ productName: i.title, quantity: i.quantity, unitPrice: i.price })),
  }).catch((err) => console.error("admin_notification_failed", err));
}

async function handleAccountCreation(
  createAccount: boolean,
  email: string,
  name: string,
  phone: string,
  orderId: string,
): Promise<boolean> {
  if (!createAccount) return false;
  try {
    const db = createAdminClient();
    const { NEXT_PUBLIC_SITE_URL } = serverEnv();
    const { data: newUser, error: createErr } = await db.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        data: { full_name: name.trim() },
        redirectTo: `${NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/profiil/parool-uus`,
      },
    );
    if (createErr) {
      console.error("checkout_account_invite_failed", { error: createErr.message });
      return false;
    }
    if (newUser?.user) {
      await db.from("profiles").upsert({
        id: newUser.user.id,
        email: email.toLowerCase().trim(),
        full_name: name.trim(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      await db.schema("commerce").from("orders").update({ user_id: newUser.user.id }).eq("id", orderId);
      return true;
    }
  } catch (err) {
    console.error("checkout_account_create_exception", { error: String(err) });
  }
  return false;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("checkout", clientKey, 60, 30)) {
    return NextResponse.json({ error: "Liiga palju päringuid. Proovi hetke pärast uuesti." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli tellimuse andmeid." }, { status: 400 });

  if ((parsed.data.shipping_method === "omniva" || parsed.data.shipping_method === "smartpost") && !parsed.data.parcel_machine) {
    return NextResponse.json({ error: "Palun vali pakiautomaat." }, { status: 400 });
  }

  if (parsed.data.parcel_machine) {
    try {
      const requestedMachine = parsed.data.parcel_machine;
      const machine = (await fetchParcelMachines()).find(
        (candidate) => candidate.carrier === parsed.data.shipping_method && candidate.id === requestedMachine.id,
      );
      if (!machine || requestedMachine.carrier !== parsed.data.shipping_method) {
        return NextResponse.json({ error: "Valitud pakiautomaat ei ole kehtiv." }, { status: 400 });
      }
      parsed.data.parcel_machine = {
        carrier: machine.carrier as "omniva" | "smartpost",
        id: machine.id,
        name: machine.name,
        city: machine.city,
        address: machine.address,
        zip: machine.zip,
      };
    } catch {
      return NextResponse.json({ error: "Pakiautomaadi kontrollimine ebaõnnestus. Proovi uuesti." }, { status: 502 });
    }
  }

  const requestedItems = parsed.data.items ?? [];
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Ostukorv on tühi." }, { status: 400 });
  }

  // Serveri ostukorv on ainus tõde — klient peab olema sünkroniseeritud
  const sessionId = await getCartSession(false);
  if (!sessionId) {
    return NextResponse.json({ error: "cart_not_synced" }, { status: 409 });
  }
  const cart = await readCart(sessionId);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Ostukorv on tühi." }, { status: 400 });
  }
  const requested = [...requestedItems].sort((a, b) => a.slug.localeCompare(b.slug));
  const authoritative = cart.items.map(({ slug, quantity }) => ({ slug, quantity })).sort((a, b) => a.slug.localeCompare(b.slug));
  if (JSON.stringify(requested) !== JSON.stringify(authoritative)) {
    return NextResponse.json({ error: "Ostukorv muutus. Kontrolli koguseid ja proovi uuesti." }, { status: 409 });
  }

  const db = createAdminClient();
  const { data: order, error } = await db.schema("commerce").rpc("checkout_cart", {
    p_session_id: sessionId,
    p_customer: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: buildShippingAddress(parsed.data),
      shipping_method: parsed.data.shipping_method,
    },
    p_idempotency_key: parsed.data.idempotencyKey,
    p_coupon_code: parsed.data.couponCode ?? null,
    p_invoice_requested: parsed.data.invoiceRequested,
    p_company_name: parsed.data.companyName ?? null,
    p_company_reg_code: parsed.data.companyRegCode ?? null,
  } as never);

  if (error) {
    console.error("checkout_rpc_failed", { message: error.message, code: error.code });
    if (error.message.includes("insufficient_stock")) {
      return NextResponse.json({ error: "Mõni raamat ei ole enam laos saadaval." }, { status: 409 });
    }
    if (error.message.includes("invalid_coupon")) {
      return NextResponse.json({ error: "Sooduskood ei kehti või on aegunud." }, { status: 400 });
    }
    if (error.message.includes("empty_cart") || error.message.includes("cart_not_found")) {
      return NextResponse.json({ error: "cart_not_synced" }, { status: 409 });
    }
    return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
  }

  const result = order as {
    order_id: string;
    order_number: string;
    confirmation_token: string;
    total: number;
    status: string;
  };

  // Ettetellimus: makset ei algatata
  if (result.status === "preorder") {
    notifyAdmin(result.order_id, result.order_number, 0, parsed.data.name, parsed.data.email, parsed.data.phone || null,
      cart.items.map((oi) => ({ title: oi.title, quantity: oi.quantity, price: 0 })));
    const createdAccount = await handleAccountCreation(
      parsed.data.create_account, parsed.data.email, parsed.data.name, parsed.data.phone, result.order_id,
    );
    return NextResponse.json({
      redirectUrl: `/tellimus/${result.confirmation_token}`,
      confirmationToken: result.confirmation_token,
      created_account: createdAccount,
    });
  }

  try {
    const payment = await createPayment({
      id: result.order_id,
      orderNumber: result.order_number,
      totalCents: euroDecimalToCents(Number(result.total).toFixed(2)),
      currency: "EUR",
      confirmationToken: result.confirmation_token,
      customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" },
      ip: clientKey === "unknown" ? "127.0.0.1" : clientKey,
    });
    await db.schema("commerce").from("orders")
      .update({ maksekeskus_id: payment.providerTransactionId })
      .eq("id", result.order_id);
    const createdAccount = await handleAccountCreation(
      parsed.data.create_account, parsed.data.email, parsed.data.name, parsed.data.phone, result.order_id,
    );
    return NextResponse.json({
      redirectUrl: payment.redirectUrl,
      confirmationToken: result.confirmation_token,
      created_account: createdAccount,
    });
  } catch (err) {
    const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
    console.error("maksekeskus_create_failed", {
      message: err instanceof Error ? err.message : String(err),
      cause: cause instanceof Error ? cause.message : cause,
      orderId: result.order_id,
      orderNumber: result.order_number,
    });
    return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
  }
}
