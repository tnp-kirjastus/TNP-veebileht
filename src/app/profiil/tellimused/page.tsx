"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/profiil/OrderStatusBadge";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}

function OrdersContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profiil/orders?limit=50")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div>
      <h1 className="font-heading text-3xl mb-8">Minu tellimused</h1>
      {loading ? (
        <p className="text-muted">Laadin...</p>
      ) : orders.length === 0 ? (
        <div className="border border-line p-8 text-center text-muted">
          <p>Sul pole veel tellimusi.</p>
          <Link href="/raamatud" className="text-accent font-bold hover:underline mt-2 inline-block">Sirvi raamatuid →</Link>
        </div>
      ) : (
        <div className="border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft">
              <tr>
                <th className="p-4 font-extrabold text-xs uppercase text-muted">Tellimus</th>
                <th className="p-4 font-extrabold text-xs uppercase text-muted">Kuupäev</th>
                <th className="p-4 font-extrabold text-xs uppercase text-muted">Staatus</th>
                <th className="p-4 font-extrabold text-xs uppercase text-muted text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="p-4 font-bold">
                    <Link href={`/profiil/tellimused/${o.id}`} className="hover:text-accent">{o.order_number}</Link>
                  </td>
                  <td className="p-4 text-muted">{new Date(o.created_at).toLocaleDateString("et-EE")}</td>
                  <td className="p-4"><OrderStatusBadge status={o.status} /></td>
                  <td className="p-4 text-right font-bold">{Number(o.total).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
