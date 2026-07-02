import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentMessage, verifyPaymentReturn } from "@/lib/payments/maksekeskus";

export async function POST(request: Request) {
  const raw = await request.text();
  try {
    const queryMac = new URL(request.url).searchParams.get("mac");
    const event = queryMac ? verifyPaymentMessage(raw, queryMac) : verifyPaymentReturn(raw);
    const db = createAdminClient();
    const { error } = await db.schema("commerce").rpc("process_payment_event", {
      p_event_id: event.eventId, p_transaction_id: event.providerTransactionId,
      p_reference: event.orderReference, p_status: event.status,
      p_amount: event.amount, p_currency: event.currency,
      p_merchant_identity: event.merchantIdentity, p_payload_hash: event.payloadHash,
    });
    return new Response(error ? "processing_failed" : "ok", { status: error ? 500 : 200 });
  } catch { return new Response("invalid", { status: 400 }); }
}
