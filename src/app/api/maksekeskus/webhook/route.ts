import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentMessage, verifyPaymentReturn } from "@/lib/payments/maksekeskus";
import { createShipment } from "@/lib/shipping/maksekeskus-shipping";

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

    if (result === "paid") {
      try {
        const { data: order } = await db.schema("commerce").from("orders")
          .select("id, order_number, customer_name, customer_email, customer_phone, shipping_address, shipping_method, shipment_id")
          .eq("order_number", event.orderReference).maybeSingle();
        if (order && !order.shipment_id && order.shipping_method) {
          const { data: items } = await db.schema("commerce").from("order_items")
            .select("title, quantity, price, products(sku)")
            .eq("order_id", order.id);
          const shipment = await createShipment({
            orderNumber: order.order_number,
            items: (items ?? []).map((item: Record<string, unknown>) => {
              const p = (item.products as Record<string, unknown> | null) ?? {};
              return {
                name: String(item.title ?? ""),
                sku: String(p.sku ?? ""),
                quantity: Number(item.quantity ?? 1),
                price: Number(item.price ?? 0),
              };
            }),
            customer: {
              name: order.customer_name,
              email: order.customer_email,
              phone: order.customer_phone ?? "",
              address: order.shipping_address ?? "",
            },
            carrier: order.shipping_method,
          });
          if (shipment.shipmentId) {
            await db.schema("commerce").rpc("shipment_create", {
              p_order_id: order.id,
              p_carrier: order.shipping_method,
              p_shipment_id: shipment.shipmentId,
              p_tracking_code: shipment.trackingCode,
            });
          }
        }
      } catch (shipErr) {
        console.error("maksekeskus_shipment_creation_failed", shipErr instanceof Error ? shipErr.message : String(shipErr));
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("maksekeskus_webhook_invalid", err instanceof Error ? err.message : String(err));
    return new Response("invalid", { status: 400 });
  }
}