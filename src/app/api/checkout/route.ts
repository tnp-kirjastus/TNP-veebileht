import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getCartSession, readCart } from "@/lib/cart-server";
import { createOrderToken } from "@/lib/order-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayment } from "@/lib/payments/maksekeskus";
import { euroDecimalToCents } from "@/lib/money";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getProductBySlug, getEffectivePrice, type Product } from "@/lib/data";
import { calculateShippingCost } from "@/lib/shipping/config";

const parcelMachineSchema = z.object({
  carrier: z.string(),
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  zip: z.string(),
}).nullable();

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(320),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(2).max(500),
  shipping_method: z.enum(["omniva", "smartpost", "courier"]).default("omniva"),
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({ slug: z.string().min(1).max(240), quantity: z.number().int().min(1).max(99) })).max(99).optional(),
  shipping_cost: z.number().min(0).max(100).default(0),
  parcel_machine: parcelMachineSchema,
});

function validateItems(requestedItems: { slug: string; quantity: number }[]) {
  const lineItems: Array<{ product: Product; quantity: number; effectivePrice: number }> = [];
  for (const item of requestedItems) {
    const product = getProductBySlug(item.slug);
    if (!product) throw new Error("product_not_found");
    if (product.is_archived) throw new Error("product_archived");
    if (item.quantity < 1) throw new Error("invalid_quantity");
    const price = getEffectivePrice(product);
    lineItems.push({ product, quantity: item.quantity, effectivePrice: price });
  }
  return lineItems;
}

const ORDER_COOKIE = "tnp_order";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("checkout", clientKey, 300, 10)) return NextResponse.json({ error: "Liiga palju päringuid." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli tellimuse andmeid." }, { status: 400 });

  if ((parsed.data.shipping_method === "omniva" || parsed.data.shipping_method === "smartpost") && !parsed.data.parcel_machine) {
    return NextResponse.json({ error: "Palun vali pakiautomaat." }, { status: 400 });
  }

  const requestedItems = parsed.data.items ?? [];

  // --- path A: Supabase (primary) ---
  const sessionId = await getCartSession(false);
  if (sessionId) {
    try {
      const cart = await readCart(sessionId);
      const requested = [...requestedItems].sort((a, b) => a.slug.localeCompare(b.slug));
      const authoritative = cart.items.map(({ slug, quantity }) => ({ slug, quantity })).sort((a, b) => a.slug.localeCompare(b.slug));
      if (JSON.stringify(requested) !== JSON.stringify(authoritative)) {
        return NextResponse.json({ error: "Ostukorv muutus. Kontrolli koguseid ja proovi uuesti." }, { status: 409 });
      }
      const db = createAdminClient();
      const subtotal = cart.items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0);
      const shippingCost = calculateShippingCost(parsed.data.shipping_method, subtotal);
      const orderTotal = subtotal + shippingCost;
      const { data: order, error } = await db.schema("commerce").rpc("create_order_from_cart", {
        p_session_id: sessionId, p_customer: parsed.data, p_idempotency_key: parsed.data.idempotencyKey,
        p_shipping_cost: shippingCost, p_total: orderTotal,
      });
      if (!error && order) {
        try {
          const payment = await createPayment({ id: order.order_id, orderNumber: order.order_number, totalCents: euroDecimalToCents(String(orderTotal)), currency: "EUR", confirmationToken: order.confirmation_token, customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" }, ip: clientKey === "unknown" ? "127.0.0.1" : clientKey });
          await db.schema("commerce").from("orders").update({ maksekeskus_id: payment.providerTransactionId }).eq("id", order.order_id);
          return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: order.confirmation_token });
        } catch (err) {
          console.error("maksekeskus_create_failed", err instanceof Error ? err.message : String(err));
          return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
        }
      }
    } catch { /* fall through */ }
  }

  // --- path B: client-supplied items, validated against products.json ---
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Ostukorv on tühi." }, { status: 400 });
  }

  let lineItems: ReturnType<typeof validateItems>;
  try {
    lineItems = validateItems(requestedItems);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg === "product_not_found" || msg === "product_archived") return NextResponse.json({ error: "Mõni raamat ei ole enam saadaval." }, { status: 409 });
    return NextResponse.json({ error: "Kontrolli tellimuse andmeid." }, { status: 400 });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.effectivePrice * li.quantity, 0);
  const shippingCost = calculateShippingCost(parsed.data.shipping_method, subtotal);
  const orderTotal = subtotal + shippingCost;
  const totalCents = Math.round(orderTotal * 100);
  const orderNumber = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const confirmationToken = crypto.randomUUID().replace(/-/g, "");

  const orderSnapshot = {
    orderNumber,
    total: orderTotal,
    totalCents,
    subtotal,
    shippingCost,
    customer: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      shippingMethod: parsed.data.shipping_method,
      shippingCarrier: parsed.data.shipping_method,
    },
    parcelMachine: parsed.data.parcel_machine,
    items: lineItems.map(li => ({
      slug: li.product.slug,
      title: li.product.title_et,
      author: li.product.people.author?.join(", ") ?? "",
      price: li.product.price,
      salePrice: li.effectivePrice < li.product.price ? li.effectivePrice : null,
      quantity: li.quantity,
    })),
  };

  const orderToken = await createOrderToken(orderSnapshot);
  const cookieStore = await cookies();
  cookieStore.set(ORDER_COOKIE, orderToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  try {
    const payment = await createPayment({
      id: orderNumber,
      orderNumber,
      totalCents,
      currency: "EUR",
      confirmationToken,
      customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" },
      ip: clientKey === "unknown" ? "127.0.0.1" : clientKey,
    });
    return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken });
  } catch (err) {
    console.error("maksekeskus_create_failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
  }
}
