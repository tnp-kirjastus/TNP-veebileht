import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCartSession, readCart } from "@/lib/cart-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPayment } from "@/lib/payments/maksekeskus";
import { euroDecimalToCents, roundEuro } from "@/lib/money";
import { consumeRateLimit } from "@/lib/rate-limit";
import { calculateShippingCostAsync } from "@/lib/shipping/server";
import { validateCoupon } from "@/lib/coupons";
import { getStoreSettings } from "@/lib/settings";
import { sendNewOrderAdminEmail } from "@/lib/email";

const parcelMachineSchema = z.object({
  carrier: z.string(),
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
  zip: z.string(),
}).nullable();

const schema = z.object({
  name: z.string().trim().min(2).max(120).refine((v) => v.includes(" "), "Sisesta ees- ja perekonnanimi"),
  email: z.email().trim().max(320),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(2).max(500),
  shipping_method: z.enum(["omniva", "smartpost"]).default("omniva"),
  idempotencyKey: z.string().uuid(),
  items: z.array(z.object({ slug: z.string().min(1).max(240), quantity: z.number().int().min(1).max(99) })).max(99).optional(),
  shipping_cost: z.number().min(0).max(100).default(0),
  parcel_machine: parcelMachineSchema,
  invoiceRequested: z.boolean().default(false),
  companyName: z.string().max(200).optional(),
  companyRegCode: z.string().max(50).optional(),
  couponCode: z.string().max(50).optional(),
  couponDiscount: z.number().min(0).default(0),
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
  createdAt: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string | null,
  items: Array<{ title: string; quantity: number; price: number }>,
) {
  sendNewOrderAdminEmail({
    orderId,
    orderNumber,
    total,
    createdAt,
    customerName,
    customerEmail,
    customerPhone,
    items: items.map((i) => ({ productName: i.title, quantity: i.quantity, unitPrice: i.price })),
  }).catch((err) => console.error("admin_notification_failed", err));
}

async function handleAccountCreation(
  createAccount: boolean,
  password: string | undefined,
  email: string,
  name: string,
  phone: string,
  orderId: string,
): Promise<boolean> {
  if (!createAccount || !password || password.length < 6) return false;
  try {
    const db = createAdminClient();
    const { data: newUser, error: createErr } = await db.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name.trim() },
    });
    if (createErr) {
      if (createErr.message?.includes("already") || createErr.status === 422) {
        const { data: existing } = await db.auth.admin.listUsers({ page: 0, perPage: 1 });
        const match = existing?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase().trim()
        );
        if (match) {
          await db.schema("commerce").from("orders").update({ user_id: match.id }).eq("id", orderId);
        }
      } else {
        console.error("checkout_account_create_failed", { error: createErr.message, email });
      }
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
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("checkout", clientKey, 60, 30)) return NextResponse.json({ error: "Liiga palju päringuid. Proovi hetke pärast uuesti." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli tellimuse andmeid." }, { status: 400 });

  if ((parsed.data.shipping_method === "omniva" || parsed.data.shipping_method === "smartpost") && !parsed.data.parcel_machine) {
    return NextResponse.json({ error: "Palun vali pakiautomaat." }, { status: 400 });
  }

  const requestedItems = parsed.data.items ?? [];
  if (requestedItems.length === 0) {
    return NextResponse.json({ error: "Ostukorv on tühi." }, { status: 400 });
  }

  const shippingAddress = buildShippingAddress(parsed.data);

  const storeSettings = await getStoreSettings();
  const vatPercent = storeSettings.vat.percent;

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

        const allPreorder = cart.items.every(item => item.isUpcoming && item.allowPreorder);

        if (allPreorder) {
          const confirmationToken = randomBytes(32).toString("hex");
          const orderNumber = `TNP-${new Date().getFullYear()}-D${Date.now().toString(36).toUpperCase()}`;

          const { data: order, error: orderError } = await db.schema("commerce").from("orders")
            .insert({
              order_number: orderNumber,
              status: "preorder",
              customer_name: parsed.data.name.trim(),
              customer_email: parsed.data.email.toLowerCase().trim(),
              customer_phone: parsed.data.phone.trim() || null,
              shipping_address: shippingAddress,
              shipping_method: parsed.data.shipping_method,
              subtotal: 0,
              shipping_cost: 0,
              total: 0,
              idempotency_key: parsed.data.idempotencyKey,
              confirmation_token: confirmationToken,
              currency: "EUR",
              invoice_requested: parsed.data.invoiceRequested,
              company_name: parsed.data.companyName || null,
              company_reg_code: parsed.data.companyRegCode || null,
              coupon_code: parsed.data.couponCode || null,
              coupon_discount: 0,
              vat_amount: 0,
              vat_percent: vatPercent,
            })
            .select("id, order_number, confirmation_token")
            .single();

          if (orderError || !order) {
            console.error("checkout_path_a_preorder_insert_failed", { error: orderError?.message });
            pathAError = `preorder_insert_error:${orderError?.message}`;
          } else {
            const preorderItemRows = cart.items.map(oi => ({
              order_id: order.id,
              product_id: oi.productId,
              title: oi.title,
              price: 0,
              quantity: oi.quantity,
            }));

            const { error: itemsError } = await db.schema("commerce").from("order_items").insert(preorderItemRows);
            if (itemsError) {
              console.error("checkout_path_a_preorder_items_failed", { error: itemsError.message });
              await db.schema("commerce").from("orders").delete().eq("id", order.id);
              pathAError = `preorder_items_error:${itemsError.message}`;
            } else {
              const { data: cartRow } = await db.schema("commerce").from("carts")
                .select("id").eq("session_id", sessionId).maybeSingle();
              if (cartRow) {
                await db.schema("commerce").from("cart_items").delete().eq("cart_id", cartRow.id);
              }
              notifyAdmin(
                order.id, order.order_number, 0, new Date().toISOString(),
                parsed.data.name, parsed.data.email, parsed.data.phone || null,
                cart.items.map(oi => ({ title: oi.title, quantity: oi.quantity, price: 0 })),
              );
              const createdAccount = await handleAccountCreation(
                parsed.data.create_account, parsed.data.password,
                parsed.data.email, parsed.data.name, parsed.data.phone, order.id,
              );
              return NextResponse.json({
                redirectUrl: `/tellimus/${order.confirmation_token}`,
                confirmationToken: order.confirmation_token,
                created_account: createdAccount,
              });
            }
          }
        } else {
          const subtotal = cart.items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0);
          const coupon = parsed.data.couponCode ? validateCoupon(parsed.data.couponCode, subtotal) : null;
          if (parsed.data.couponCode && !coupon) {
            return NextResponse.json({ error: "Sooduskood ei kehti või on aegunud." }, { status: 400 });
          }
          const discountAmount = coupon?.discount ?? 0;
          const shippingCost = await calculateShippingCostAsync(parsed.data.shipping_method, subtotal);
          const orderTotal = roundEuro(subtotal + shippingCost - discountAmount);
          const KM_PERCENT = vatPercent;
          const taxableSubtotal = subtotal - discountAmount;
          const vatAmount = roundEuro(taxableSubtotal - (taxableSubtotal / (1 + KM_PERCENT / 100)));

          const customerPayload = {
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            address: shippingAddress,
            shipping_method: parsed.data.shipping_method,
          };

          const { data: order, error } = await db.schema("commerce").rpc("create_order_from_cart", {
            p_session_id: sessionId,
            p_customer: customerPayload,
            p_idempotency_key: parsed.data.idempotencyKey,
            p_shipping_cost: shippingCost,
            p_total: orderTotal,
          });

          if (error) {
            pathAError = `rpc_error:${error.message}`;
          } else if (order) {
            try {
              const payment = await createPayment({ id: order.order_id, orderNumber: order.order_number, totalCents: euroDecimalToCents(orderTotal.toFixed(2)), currency: "EUR", confirmationToken: order.confirmation_token, customer: { name: parsed.data.name, email: parsed.data.email, country: "ee", locale: "et" }, ip: clientKey === "unknown" ? "127.0.0.1" : clientKey });
              await db.schema("commerce").from("orders").update({
                maksekeskus_id: payment.providerTransactionId,
                shipping_address: shippingAddress,
                invoice_requested: parsed.data.invoiceRequested,
                company_name: parsed.data.companyName || null,
                company_reg_code: parsed.data.companyRegCode || null,
                coupon_code: coupon?.code ?? null,
                coupon_discount: discountAmount,
                vat_amount: vatAmount,
                vat_percent: KM_PERCENT,
              }).eq("id", order.order_id);
              const createdAccount = await handleAccountCreation(
                parsed.data.create_account, parsed.data.password,
                parsed.data.email, parsed.data.name, parsed.data.phone, order.order_id,
              );
              return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: order.confirmation_token, created_account: createdAccount });
            } catch (err) {
              const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
              console.error("maksekeskus_create_failed", {
                message: err instanceof Error ? err.message : String(err),
                name: err instanceof Error ? err.name : undefined,
                cause: cause instanceof Error ? cause.message : cause,
                orderId: order.order_id,
                orderNumber: order.order_number,
                path: "A",
              });
              return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
            }
          }
        }
      }
    } catch (err) {
      const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
      pathAError = `exception:${err instanceof Error ? err.message : String(err)}` + (cause instanceof Error ? ` (cause: ${cause.message})` : "");
    }
  }

  // --- path B: direct order creation from validated Supabase products ---
  const db = createAdminClient();
  const productSlugs = requestedItems.map(i => i.slug);
  const { data: dbProducts, error: productsError } = await db.schema("commerce").from("products")
    .select("id, slug, sku, title_et, price, sale_price, sale_start, sale_end, stock, is_archived, is_upcoming, allow_preorder")
    .in("slug", productSlugs);

  if (productsError || !dbProducts || dbProducts.length === 0) {
    console.error("checkout_path_b_product_lookup_failed", { productsError: productsError?.message, pathAError });
    return NextResponse.json({ error: "Mõni raamat ei ole enam saadaval." }, { status: 409 });
  }

  const dbProductMap = new Map(dbProducts.map(p => [p.slug, p]));

  let subtotal = 0;
  const orderItems: Array<{ productId: string; title: string; price: number; quantity: number }> = [];

  for (const item of requestedItems) {
    const dbProduct = dbProductMap.get(item.slug);
    if (!dbProduct || dbProduct.is_archived) {
      console.error("checkout_path_b_product_unavailable", { slug: item.slug, pathAError });
      return NextResponse.json({ error: "Mõni raamat ei ole enam saadaval." }, { status: 409 });
    }
    const isPreorder = dbProduct.is_upcoming && dbProduct.allow_preorder;
    if (!isPreorder && dbProduct.stock < item.quantity) {
      console.error("checkout_path_b_product_unavailable", { slug: item.slug, pathAError });
      return NextResponse.json({ error: "Mõni raamat ei ole enam saadaval." }, { status: 409 });
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

  const allPreorder = requestedItems.every(item => {
    const p = dbProductMap.get(item.slug);
    return p ? (p.is_upcoming && p.allow_preorder) : false;
  });

  if (allPreorder) {
    const confirmationToken = randomBytes(32).toString("hex");
    const orderNumber = `TNP-${new Date().getFullYear()}-D${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await db.schema("commerce").from("orders")
      .insert({
        order_number: orderNumber,
        status: "preorder",
        customer_name: parsed.data.name.trim(),
        customer_email: parsed.data.email.toLowerCase().trim(),
        customer_phone: parsed.data.phone.trim() || null,
        shipping_address: shippingAddress,
        shipping_method: parsed.data.shipping_method,
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        idempotency_key: parsed.data.idempotencyKey,
        confirmation_token: confirmationToken,
        currency: "EUR",
        invoice_requested: parsed.data.invoiceRequested,
        company_name: parsed.data.companyName || null,
        company_reg_code: parsed.data.companyRegCode || null,
        coupon_code: parsed.data.couponCode || null,
        coupon_discount: 0,
        vat_amount: 0,
          vat_percent: vatPercent,
      })
      .select("id, order_number, confirmation_token")
      .single();

    if (orderError || !order) {
      console.error("checkout_path_b_preorder_insert_failed", { error: orderError?.message, pathAError });
      return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
    }

    const orderItemRows = orderItems.map(oi => ({
      order_id: order.id,
      product_id: oi.productId,
      title: oi.title,
      price: 0,
      quantity: oi.quantity,
    }));

    const { error: itemsError } = await db.schema("commerce").from("order_items").insert(orderItemRows);
    if (itemsError) {
      console.error("checkout_path_b_preorder_items_failed", { error: itemsError.message, pathAError });
      await db.schema("commerce").from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
    }

    notifyAdmin(
      order.id, order.order_number, 0, new Date().toISOString(),
      parsed.data.name, parsed.data.email, parsed.data.phone || null,
      orderItems.map(oi => ({ title: oi.title, quantity: oi.quantity, price: 0 })),
    );

    const createdAccountBPre = await handleAccountCreation(
      parsed.data.create_account, parsed.data.password,
      parsed.data.email, parsed.data.name, parsed.data.phone, order.id,
    );

    return NextResponse.json({
      redirectUrl: `/tellimus/${order.confirmation_token}`,
      confirmationToken: order.confirmation_token,
      created_account: createdAccountBPre,
    });
  }

  const shippingCost = await calculateShippingCostAsync(parsed.data.shipping_method, subtotal);
  const coupon = parsed.data.couponCode ? validateCoupon(parsed.data.couponCode, subtotal) : null;
  if (parsed.data.couponCode && !coupon) {
    return NextResponse.json({ error: "Sooduskood ei kehti või on aegunud." }, { status: 400 });
  }
  const discountAmount = coupon?.discount ?? 0;
  const orderTotal = roundEuro(subtotal + shippingCost - discountAmount);
  const totalCents = euroDecimalToCents(orderTotal.toFixed(2));
  const KM_PERCENT = vatPercent;
  const taxableSubtotal = subtotal - discountAmount;
  const vatAmount = roundEuro(taxableSubtotal - (taxableSubtotal / (1 + KM_PERCENT / 100)));
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
      invoice_requested: parsed.data.invoiceRequested,
      company_name: parsed.data.companyName || null,
      company_reg_code: parsed.data.companyRegCode || null,
      coupon_code: coupon?.code ?? null,
      coupon_discount: discountAmount,
      vat_amount: vatAmount,
      vat_percent: KM_PERCENT,
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
          const createdAccountIdem = await handleAccountCreation(
            parsed.data.create_account, parsed.data.password,
            parsed.data.email, parsed.data.name, parsed.data.phone, existing.id,
          );
          return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: existing.confirmation_token, created_account: createdAccountIdem });
        } catch (err) {
          const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
          console.error("maksekeskus_create_failed_retry", {
            message: err instanceof Error ? err.message : String(err),
            name: err instanceof Error ? err.name : undefined,
            cause: cause instanceof Error ? cause.message : cause,
            orderId: existing.id,
            orderNumber: existing.order_number,
            path: "B-idempotency",
          });
          return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
        }
      }
    }
    console.error("checkout_path_b_order_insert_failed", { error: orderError?.message, pathAError });
    return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
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
    return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
  }

  const reservationRows = orderItems.map((oi) => ({
    order_id: order.id,
    product_id: oi.productId,
    quantity: oi.quantity,
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  }));
  const { error: reservationError } = await db.schema("commerce").from("stock_reservations").insert(reservationRows);
  if (reservationError) {
    console.error("checkout_path_b_reservations_failed", { error: reservationError.message, pathAError });
    await db.schema("commerce").from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Tellimuse loomine ebaõnnestus. Proovi uuesti." }, { status: 500 });
  }

  notifyAdmin(
    order.id, order.order_number, orderTotal, new Date().toISOString(),
    parsed.data.name, parsed.data.email, parsed.data.phone || null,
    orderItems.map(oi => ({ title: oi.title, quantity: oi.quantity, price: oi.price })),
  );

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
    const createdAccountBNorm = await handleAccountCreation(
      parsed.data.create_account, parsed.data.password,
      parsed.data.email, parsed.data.name, parsed.data.phone, order.id,
    );
    return NextResponse.json({ redirectUrl: payment.redirectUrl, confirmationToken: order.confirmation_token, created_account: createdAccountBNorm });
  } catch (err) {
    const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
    console.error("maksekeskus_create_failed", {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined,
      cause: cause instanceof Error ? cause.message : cause,
      orderId: order.id,
      orderNumber: order.order_number,
      path: "B",
    });
    return NextResponse.json({ error: "Makse algatamine ebaõnnestus. Proovi uuesti." }, { status: 502 });
  }
}
