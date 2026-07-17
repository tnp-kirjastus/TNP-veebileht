"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/profiil/OrderStatusBadge";

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

export default function ProfiilDashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profiil/orders?limit=5")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const name = profile?.full_name || user?.email?.split("@")[0] || "";

  return (
    <div>
      <h1 className="font-heading text-3xl mb-1">Tere, {name}</h1>
      <p className="text-muted mb-10">Siin saad hallata oma kontot, tellimusi ja profiili.</p>

      <div className="grid grid-cols-2 gap-4 mb-10 max-sm:grid-cols-1">
        <Link href="/profiil/seaded" className="border border-line bg-panel p-6 hover:border-ink/30 transition-colors">
          <h3 className="font-bold text-lg">Profiil</h3>
          <p className="text-sm text-muted mt-1">Muuda oma nime, telefoni ja parooli.</p>
        </Link>
        <Link href="/profiil/tellimused" className="border border-line bg-panel p-6 hover:border-ink/30 transition-colors">
          <h3 className="font-bold text-lg">Tellimused</h3>
          <p className="text-sm text-muted mt-1">Vaata oma tellimusi ja nende staatust.</p>
        </Link>
      </div>

      <h2 className="font-heading text-2xl mb-4">Viimased tellimused</h2>
      <div className="border border-line">
        {loading ? (
          <p className="p-8 text-center text-muted">Laadin...</p>
        ) : orders.length === 0 ? (
          <p className="p-8 text-center text-muted">
            Sul pole veel tellimusi.{" "}
            <Link href="/raamatud" className="text-accent font-bold hover:underline">Sirvi raamatuid →</Link>
          </p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
