import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentReturn } from "@/lib/payments/maksekeskus";

async function handle(request: Request) {
  const raw = request.method === "POST" ? await request.text() : new URL(request.url).searchParams.toString();
  try {
    const event = verifyPaymentReturn(raw);

    const db = createAdminClient();
    await db.schema("commerce").rpc("process_payment_event", {
      p_event_id: event.eventId, p_transaction_id: event.providerTransactionId,
      p_reference: event.orderReference, p_status: event.status,
      p_amount: event.amount, p_currency: event.currency,
      p_merchant_identity: event.merchantIdentity, p_payload_hash: event.payloadHash,
    });
    const { data: order } = await db.schema("commerce").from("orders")
      .select("confirmation_token").eq("order_number", event.orderReference).maybeSingle();
    if (order?.confirmation_token) {
      return NextResponse.redirect(new URL(`/tellimus/${order.confirmation_token}`, request.url), 303);
    }
    throw new Error("no_confirmation_token");
  } catch (err) {
    console.error("maksekeskus_return_failed", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(new URL("/ostukorv?payment=invalid", request.url), 303);
  }
}
export const POST = handle; export const GET = handle;
