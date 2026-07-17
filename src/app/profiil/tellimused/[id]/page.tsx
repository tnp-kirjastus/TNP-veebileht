"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/profiil/OrderStatusBadge";

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface StatusEntry {
  status: string;
  note: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total: number;
  shipping_cost: number;
  subtotal: number;
  vat_amount: number;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_method: string;
  items: OrderItem[];
  status_history: StatusEntry[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <OrderDetailContent id={id} />
    </ProtectedRoute>
  );
}

function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/profiil/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOrder(data.order ?? null);
      })
      .catch(() => setError("Tellimuse laadimine ebaõnnestus."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-muted py-12">Laadin...</p>;
  if (error) return <p className="text-accent py-12">{error}</p>;
  if (!order) return <p className="text-muted py-12">Tellimust ei leitud.</p>;

  return (
    <div>
      <Link href="/profiil/tellimused" className="text-accent font-bold text-sm hover:underline mb-4 inline-block">← Tagasi tellimuste juurde</Link>
      <h1 className="font-heading text-3xl mb-2">Tellimus {order.order_number}</h1>
      <div className="flex items-center gap-3 mb-8">
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted">{new Date(order.created_at).toLocaleDateString("et-EE")}</span>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="border border-line">
          <h3 className="font-bold text-sm p-4 bg-soft border-b border-line">Tooted</h3>
          <div className="divide-y divide-line">
            {order.items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-4 p-4 text-sm">
                <div>
                  <span className="font-bold">{item.title}</span>
                  <span className="text-muted ml-2">×{item.quantity}</span>
                </div>
                <span className="font-bold whitespace-nowrap">{(Number(item.price) * item.quantity).toFixed(2)} €</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-4 text-sm grid gap-1">
            <div className="flex justify-between">
              <span className="text-muted">Vahesumma</span>
              <span>{Number(order.subtotal).toFixed(2)} €</span>
            </div>
            {Number(order.shipping_cost) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Tarne</span>
                <span>{Number(order.shipping_cost).toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-muted text-xs">
              <span>Käibemaks</span>
              <span>{Number(order.vat_amount).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-line">
              <span>Kokku</span>
              <span>{Number(order.total).toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="border border-line">
          <h3 className="font-bold text-sm p-4 bg-soft border-b border-line">Tellija andmed</h3>
          <div className="p-4 text-sm grid gap-1">
            <p><span className="text-muted">Nimi:</span> {order.customer_name}</p>
            <p><span className="text-muted">E-post:</span> {order.customer_email}</p>
            {order.customer_phone && <p><span className="text-muted">Telefon:</span> {order.customer_phone}</p>}
            <p><span className="text-muted">Tarne:</span> {order.shipping_address}</p>
          </div>
        </div>

        {order.status_history && order.status_history.length > 0 && (
          <div className="border border-line">
            <h3 className="font-bold text-sm p-4 bg-soft border-b border-line">Staatuse ajalugu</h3>
            <div className="p-4">
              {order.status_history.map((entry, i) => (
                <div key={i} className="flex gap-3 pb-3 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-ink mt-1" />
                    {i < order.status_history.length - 1 && <div className="w-px flex-1 bg-line mt-1" />}
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={entry.status} />
                      <span className="text-xs text-muted">{new Date(entry.created_at).toLocaleString("et-EE")}</span>
                    </div>
                    {entry.note && <p className="text-muted mt-1">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
