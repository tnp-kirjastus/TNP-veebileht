import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentMessage, verifyPaymentReturn } from "@/lib/payments/maksekeskus";
import { ensureOrderFulfilled } from "@/lib/orders/fulfillment";

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    const queryMac = new URL(request.url).searchParams.get("mac");
    const event = queryMac ? verifyPaymentMessage(raw, queryMac) : verifyPaymentReturn(raw);
    const db = createAdminClient();
    const { data: result, error } = await db.schema("commerce").rpc("process_payment_event", {
      p_event_id: event.eventId, p_transaction_id: event.providerTransactionId,
      p_reference: event.orderReference, p_status: event.status,
      p_amount: event.amount, p_currency: event.currency,
      p_merchant_identity: event.merchantIdentity, p_payload_hash: event.payloadHash,
    });
    if (error) {
      console.error("maksekeskus_webhook_processing_failed", { error: error.message, event_id: event.eventId, status: event.status });
      return new Response("processing_failed", { status: 500 });
    }

    if (result === "paid" || result === "duplicate") await ensureOrderFulfilled(event.orderReference);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("maksekeskus_webhook_invalid", err instanceof Error ? err.message : String(err));
    return new Response("invalid", { status: 400 });
  }
}
