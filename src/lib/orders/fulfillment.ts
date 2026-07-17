import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createShipment } from "@/lib/shipping/maksekeskus-shipping";

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_method: string | null;
  shipment_id: string | null;
  total: number | string | null;
};

type OrderItemRow = {
  title: string | null;
  quantity: number | null;
  price: number | string | null;
  products: { sku?: string | null } | { sku?: string | null }[] | null;
};

function productSku(products: OrderItemRow["products"]) {
  const product = Array.isArray(products) ? products[0] : products;
  return String(product?.sku ?? "");
}

async function hasProcessedConfirmationEmail(orderId: string) {
  const db = createAdminClient();
  const { data } = await db.schema("commerce").from("outbox")
    .select("id")
    .eq("event_type", "email.order_confirmation")
    .contains("payload", { order_id: orderId })
    .not("processed_at", "is", null)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function ensureOrderFulfilled(orderNumber: string) {
  const db = createAdminClient();
  const { data: order } = await db.schema("commerce").from("orders")
    .select("id, order_number, status, customer_name, customer_email, customer_phone, shipping_address, shipping_method, shipment_id, total")
    .eq("order_number", orderNumber)
    .maybeSingle<OrderRow>();

  if (!order || order.status !== "paid") return;

  const { data: items } = await db.schema("commerce").from("order_items")
    .select("title, quantity, price, products(sku)")
    .eq("order_id", order.id);
  const orderItems = ((items ?? []) as OrderItemRow[]).map((item) => ({
    title: String(item.title ?? ""),
    quantity: Number(item.quantity ?? 1),
    price: Number(item.price ?? 0),
    sku: productSku(item.products),
  }));

  try {
    if (order.customer_email && !await hasProcessedConfirmationEmail(order.id)) {
      await sendOrderConfirmationEmail({
        orderId: order.id,
        to: order.customer_email,
        orderNumber: order.order_number,
        customerName: order.customer_name ?? "",
        total: Number(order.total ?? 0),
        items: orderItems.map(({ title, quantity, price }) => ({ title, quantity, price })),
      });
    }
  } catch (emailErr) {
    console.error("confirmation_email_error", emailErr instanceof Error ? emailErr.message : String(emailErr));
  }

  try {
    if (!order.shipment_id && order.shipping_method) {
      let parcelMachineId: string | undefined;
      if (order.shipping_method !== "courier" && order.shipping_address) {
        const parts = order.shipping_address.split("||");
        if (parts.length >= 2 && parts[1].length > 0) parcelMachineId = parts[1];
      }

      const shipment = await createShipment({
        orderNumber: order.order_number,
        items: orderItems.map((item) => ({
          name: item.title,
          sku: item.sku,
          quantity: item.quantity,
          price: item.price,
        })),
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
