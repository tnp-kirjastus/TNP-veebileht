import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentReturn } from "@/lib/payments/maksekeskus";
import { verifyOrderToken } from "@/lib/order-session";

const ORDER_COOKIE = "tnp_order";

async function handle(request: Request) {
  const raw = request.method === "POST" ? await request.text() : new URL(request.url).searchParams.toString();
  try {
    const event = verifyPaymentReturn(raw);

    // try Supabase first
    let token: string | null = null;
    try {
      const db = createAdminClient();
      await db.schema("commerce").rpc("process_payment_event", { p_event_id: event.eventId, p_transaction_id: event.providerTransactionId, p_reference: event.orderReference, p_status: event.status, p_amount: event.amount, p_currency: event.currency, p_merchant_identity: event.merchantIdentity, p_payload_hash: event.payloadHash });
      const { data: order } = await db.schema("commerce").from("orders").select("confirmation_token").eq("order_number", event.orderReference).maybeSingle();
      if (order?.confirmation_token) token = order.confirmation_token;
    } catch { /* Supabase unavailable */ }

    // fallback: cookie-based order
    if (!token) {
      const cookieStore = await cookies();
      const rawToken = cookieStore.get(ORDER_COOKIE)?.value;
      if (rawToken) {
        const order = await verifyOrderToken(rawToken);
        if (order) token = "local"; // use a fixed token prefix for cookie-based orders
      }
    }

    if (!token) throw new Error("no_order");
    return NextResponse.redirect(new URL(`/tellimus/${token}`, request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/ostukorv?payment=invalid", request.url), 303);
  }
}
export const POST = handle; export const GET = handle;
