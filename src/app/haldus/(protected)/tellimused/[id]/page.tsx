import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderDetailClient } from "@/components/admin/OrderDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadOrder(id: string) {
  const db = createAdminClient();

  const { data: order, error: orderErr } = await db.schema("commerce").from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", id)
    .single();

  if (orderErr || !order) return null;

  const items = ((order.order_items ?? []) as Record<string, unknown>[]);
  const history = ((order.order_status_history ?? []) as Record<string, unknown>[]);

  return {
    id: order.id as string,
    order_number: order.order_number as string,
    status: order.status as string,
    total: Number(order.total ?? 0),
    subtotal: Number(order.subtotal ?? 0),
    shipping_cost: Number(order.shipping_cost ?? 0),
    currency: (order.currency as string) || "EUR",
    created_at: order.created_at as string,
    updated_at: order.updated_at as string,
    customer_name: order.customer_name as string,
    customer_email: order.customer_email as string,
    customer_phone: (order.customer_phone as string) || null,
    shipping_address: order.shipping_address as string,
    shipping_method: (order.shipping_method as string) || null,
    maksekeskus_id: (order.maksekeskus_id as string) || null,
    shipment_id: (order.shipment_id as string) || null,
    tracking_code: (order.tracking_code as string) || null,
    shipping_carrier: (order.shipping_carrier as string) || null,
    paid_at: (order.paid_at as string) || null,
    shipped_at: (order.shipped_at as string) || null,
    delivered_at: (order.delivered_at as string) || null,
    cancelled_at: (order.cancelled_at as string) || null,
    invoice_requested: (order.invoice_requested as boolean) || false,
    company_name: (order.company_name as string) || null,
    company_reg_code: (order.company_reg_code as string) || null,
    vat_amount: Number(order.vat_amount ?? 0),
    vat_percent: Number(order.vat_percent ?? 9),
    coupon_code: (order.coupon_code as string) || null,
    coupon_discount: Number(order.coupon_discount ?? 0),
    items: items.map((item) => ({
      id: item.id as string,
      product_id: (item.product_id as string) || null,
      title: item.title as string,
      price: Number(item.price ?? 0),
      quantity: Number(item.quantity ?? 1),
    })),
    history: history.map((h) => ({
      id: h.id as string,
      status: h.status as string,
      note: (h.note as string) || null,
      changed_by: (h.changed_by as string) || null,
      created_at: h.created_at as string,
    })),
  };
}

export default async function OrderDetailPage({ params }: PageProps) {
  await requireAdminSession(["editor", "admin"]);

  const { id } = await params;
  const order = await loadOrder(id);

  if (!order) notFound();

  return (
    <div>
      <AdminPageHeader
        title={`Tellimus ${order.order_number}`}
        description={new Date(order.created_at).toLocaleString("et-EE")}
        breadcrumbs={[
          { label: "Ülevaade", href: "/haldus" },
          { label: "Tellimused", href: "/haldus/tellimused" },
          { label: order.order_number },
        ]}
        action={
          <Link
            href="/haldus/tellimused"
            className="inline-flex items-center gap-1.5 min-h-12 px-5 border border-line text-sm font-bold hover:bg-soft transition-colors"
          >
            ← Tagasi
          </Link>
        }
      />

      <OrderDetailClient order={order} />
    </div>
  );
}
