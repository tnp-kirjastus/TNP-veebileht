import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCartSession, readCart } from "@/lib/cart-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayment } from "@/lib/payments/maksekeskus";
import { euroDecimalToCents } from "@/lib/money";
import { consumeRateLimit } from "@/lib/rate-limit";
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

function buildShippingAddress(parsed: z.infer<typeof schema>): string {
  if (parsed.shipping_method === "courier") return parsed.address;
  if (parsed.parcel_machine) {
    return `${parsed.parcel_machine.carrier}||${parsed.parcel_machine.id}||${parsed.parcel_machine.name}||${parsed.parcel_machine.address}||${parsed.parcel_machine.city}||${parsed.parcel_machine.zip}`;
  }
  return parsed.address;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("checkout", clientKey, 60, 30)) return NextResponse.json({ error: "Liiga palju p\u00e4ringuid. Proovi hetke p\u00e4rast uuesti." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli tellimuse andmeid." }, { status: 400 });

  if ((parsed.data.shipping_method === "omniva" || parsed.data.shipping_method === "smartpost") && !parsed.data.parcel_machine) {
    return NextResponse.json({ error: "Palun vali pakiautomaat." }, { status: 400 });
  }

  const requestedItems = parsed.data.items ?? [];
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Ostukorv on t\u00fchi." }, { status: 400 });
  }

  const shippingAddress = buildShippingAddress(parsed.data);

  // --- path A: Supabase cart (primary, preferred) ---
  const sessionId = await getCartSession(false);
  let pathAError: string | null = null;

  if (sessionId) {
    try {
      const cart = await readCart(sessionId);
      if (cart.items.length === 0) {
        pathAError = "empty_cart";
      } else {
        const requested = [...requestedItems].sort((a, b) => a.slug.localeCompare(b.slug));
        const authoritative = cart.items.map(({ slug, quantity }) => ({ slug, quantity })).sort((a, b) => a.slug.localeCompare(b.slug));
        if (JSON.stringify(requested) !== JSON.stringify(authoritative)) {
          return NextResponse.json({ error: "Ostukorv muutus. Kontrolli koguseid ja proovi uuesti." }, { status: 409 });
        }

        const db = createAdminClient();
        const subtotal = cart.items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0);
        const shippingCost = calculateShippingCost(parsed.data.shipping_method, subtotal);
        const orderTotal = subtotal + shippingCost;

        const customerPayload = {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          address: shippingAddress,
          shipping_method: parsed.data.shipping_method,
        };

        const { data: order, error } = await db.schema("commerce").rpc("create_order_from_cart", {
          p_session_id: sessionId, p_customer: customerPayload, p_idempotency_key: parsed.data.idempotencyKey,
        });

        if (error) {
          pathAError = `rpc_error:${error.message}`;
        } else if (order) {
          try {
            const payment = await createPayment({ id: order.order_id, orderNumber: order.order_number, totalCents: euroDecimalToCents(String(orderTotal)), currency: "EUR", confirmationToken: order.confirmation_token, customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" }, ip: clientKey === "unknown" ? "127.0.0.1" : clientKey });
            await db.schema("commerce").from("orders").update({ maksekeskus_id: payment.providerTransactionId, shipping_address: shippingAddress }).eq("id", order.order_id);
            return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: order.confirmation_token });
          } catch (err) {
            console.error("maksekeskus_create_failed", err instanceof Error ? err.message : String(err));
            return NextResponse.json({ error: "Makse algatamine eba\u00f5nnestus. Proovi uuesti." }, { status: 502 });
          }
        }
      }
    } catch (err) {
      pathAError = `exception:${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // --- path B: direct order creation from validated Supabase products ---
  const db = createAdminClient();
  const productSlugs = requestedItems.map(i => i.slug);
  const { data: dbProducts, error: productsError } = await db.schema("commerce").from("products")
    .select("id, slug, sku, title_et, price, sale_price, sale_start, sale_end, stock, is_archived")
    .in("slug", productSlugs);

  if (productsError || !dbProducts || dbProducts.length === 0) {
    console.error("checkout_path_b_product_lookup_failed", { productsError: productsError?.message, pathAError });
    return NextResponse.json({ error: "M\u00f5ni raamat ei ole enam saadaval." }, { status: 409 });
  }

  const dbProductMap = new Map(dbProducts.map(p => [p.slug, p]));

  let subtotal = 0;
  const orderItems: Array<{ productId: string; title: string; price: number; quantity: number }> = [];

  for (const item of requestedItems) {
    const dbProduct = dbProductMap.get(item.slug);
    if (!dbProduct || dbProduct.is_archived || dbProduct.stock < item.quantity) {
      console.error("checkout_path_b_product_unavailable", { slug: item.slug, pathAError });
      return NextResponse.json({ error: "M\u00f5ni raamat ei ole enam saadaval." }, { status: 409 });
    }
    const now = Date.now();
    const start = dbProduct.sale_start ? Date.parse(String(dbProduct.sale_start)) : null;
    const end = dbProduct.sale_end ? Date.parse(String(dbProduct.sale_end)) : null;
    const productPrice = Number(dbProduct.price);
    let effectivePrice = productPrice;
    if (dbProduct.sale_price !== null && Number(dbProduct.sale_price) < productPrice
      && (start === null || (!Number.isNaN(start) && start <= now))
      && (end === null || (!Number.isNaN(end) && end >= now))) {
      effectivePrice = Number(dbProduct.sale_price);
    }
    orderItems.push({ productId: String(dbProduct.id), title: String(dbProduct.title_et), price: effectivePrice, quantity: item.quantity });
    subtotal += effectivePrice * item.quantity;
  }

  const shippingCost = calculateShippingCost(parsed.data.shipping_method, subtotal);
  const orderTotal = subtotal + shippingCost;
  const totalCents = Math.round(orderTotal * 100);
  const confirmationToken = randomBytes(32).toString("hex");
  const orderNumber = `TNP-${new Date().getFullYear()}-D${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error: orderError } = await db.schema("commerce").from("orders")
    .insert({
      order_number: orderNumber,
      status: "payment_pending",
      customer_name: parsed.data.name.trim(),
      customer_email: parsed.data.email.toLowerCase().trim(),
      customer_phone: parsed.data.phone.trim() || null,
      shipping_address: shippingAddress,
      shipping_method: parsed.data.shipping_method,
      subtotal,
      shipping_cost: shippingCost,
      total: orderTotal,
      idempotency_key: parsed.data.idempotencyKey,
      confirmation_token: confirmationToken,
      currency: "EUR",
    })
    .select("id, order_number, confirmation_token, total")
    .single();

  if (orderError || !order) {
    if (orderError?.code === "23505" && orderError.message.includes("idempotency_key")) {
      const { data: existing } = await db.schema("commerce").from("orders")
        .select("id, order_number, confirmation_token, total")
        .eq("idempotency_key", parsed.data.idempotencyKey)
        .maybeSingle();
      if (existing) {
        try {
          const payment = await createPayment({ id: existing.id, orderNumber: existing.order_number, totalCents: Math.round(Number(existing.total) * 100), currency: "EUR", confirmationToken: existing.confirmation_token, customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" }, ip: clientKey === "unknown" ? "127.0.0.1" : clientKey });
          await db.schema("commerce").from("orders").update({ maksekeskus_id: payment.providerTransactionId }).eq("id", existing.id);
          return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: existing.confirmation_token });
        } catch (err) {
          console.error("maksekeskus_create_failed_retry", err instanceof Error ? err.message : String(err));
          return NextResponse.json({ error: "Makse algatamine eba\u00f5nnestus. Proovi uuesti." }, { status: 502 });
        }
      }
    }
    console.error("checkout_path_b_order_insert_failed", { error: orderError?.message, pathAError });
    return NextResponse.json({ error: "Tellimuse loomine eba\u00f5nnestus. Proovi uuesti." }, { status: 500 });
  }

  const orderItemRows = orderItems.map(oi => ({
    order_id: order.id,
    product_id: oi.productId,
    title: oi.title,
    price: oi.price,
    quantity: oi.quantity,
  }));

  const { error: itemsError } = await db.schema("commerce").from("order_items").insert(orderItemRows);
  if (itemsError) {
    console.error("checkout_path_b_order_items_failed", { error: itemsError.message, pathAError });
    await db.schema("commerce").from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Tellimuse loomine eba\u00f5nnestus. Proovi uuesti." }, { status: 500 });
  }

  try {
    const payment = await createPayment({
      id: order.id,
      orderNumber: order.order_number,
      totalCents,
      currency: "EUR",
      confirmationToken: order.confirmation_token,
      customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" },
      ip: clientKey === "unknown" ? "127.0.0.1" : clientKey,
    });
    await db.schema("commerce").from("orders").update({ maksekeskus_id: payment.providerTransactionId }).eq("id", order.id);
    return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: order.confirmation_token });
  } catch (err) {
    console.error("maksekeskus_create_failed", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Makse algatamine eba\u00f5nnestus. Proovi uuesti." }, { status: 502 });
  }
}
