import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentMessage, verifyPaymentReturn } from "@/lib/payments/maksekeskus";
<<<<<<< HEAD
import { ensureOrderFulfilled } from "@/lib/orders/fulfillment";
=======
import { createShipment } from "@/lib/shipping/maksekeskus-shipping";
import { sendOrderConfirmationEmail } from "@/lib/email";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

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

<<<<<<< HEAD
    if (result === "paid" || result === "duplicate") await ensureOrderFulfilled(event.orderReference);
=======
    if (result === "paid") {
      // fire-and-forget: send confirmation email
      (async () => {
        try {
          const db2 = createAdminClient();
          const { data: emailOrder } = await db2.schema("commerce").from("orders")
            .select("id, order_number, customer_name, customer_email, total")
            .eq("order_number", event.orderReference).maybeSingle();
          if (emailOrder?.customer_email) {
            const { data: emailItems } = await db2.schema("commerce").from("order_items")
              .select("title, quantity, price")
              .eq("order_id", emailOrder.id);
            await sendOrderConfirmationEmail({
              orderId: emailOrder.id,
              to: emailOrder.customer_email,
              orderNumber: emailOrder.order_number,
              customerName: emailOrder.customer_name ?? "",
              total: Number(emailOrder.total ?? 0),
              items: (emailItems ?? []).map((item: Record<string, unknown>) => ({
                title: String(item.title ?? ""),
                quantity: Number(item.quantity ?? 1),
                price: Number(item.price ?? 0),
              })),
            });
          }
        } catch (emailErr) {
          console.error("confirmation_email_error", emailErr instanceof Error ? emailErr.message : String(emailErr));
        }
      })();

      try {
        const { data: order } = await db.schema("commerce").from("orders")
          .select("id, order_number, customer_name, customer_email, customer_phone, shipping_address, shipping_method, shipment_id")
          .eq("order_number", event.orderReference).maybeSingle();
        if (order && !order.shipment_id && order.shipping_method) {
          const { data: items } = await db.schema("commerce").from("order_items")
            .select("title, quantity, price, products(sku)")
            .eq("order_id", order.id);

          let parcelMachineId: string | undefined;
          if (order.shipping_method !== "courier" && order.shipping_address) {
            const parts = order.shipping_address.split("||");
            if (parts.length >= 2 && parts[1].length > 0) {
              parcelMachineId = parts[1];
            }
          }

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
            parcelMachineId,
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
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("maksekeskus_webhook_invalid", err instanceof Error ? err.message : String(err));
    return new Response("invalid", { status: 400 });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
