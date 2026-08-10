import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatEuro } from "@/lib/product-utils";
import { getDashboardData, type DashboardOrder } from "@/lib/admin/dashboard";

function orderStatusVariant(status: string): "pending" | "paid" | "shipped" | "cancelled" {
  const m: Record<string, "pending" | "paid" | "shipped" | "cancelled"> = {
    pending: "pending", payment_pending: "pending", manual_review: "pending", preorder: "pending",
    paid: "paid", processing: "paid",
    shipped: "shipped", delivered: "shipped",
    cancelled: "cancelled", expired: "cancelled", payment_failed: "cancelled", refunded: "cancelled",
  };
  return m[status] ?? "pending";
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Ootel", payment_pending: "Makse ootel", paid: "Makstud", processing: "Töötlemisel",
  shipped: "Saadetud", delivered: "Kohale toimetatud", cancelled: "Tühistatud", expired: "Aegunud",
  payment_failed: "Makse ebaõnnestus", manual_review: "Ülevaatusel", refunded: "Tagastatud", preorder: "Ettetellimus",
};

function RecentOrdersTable({ orders }: { orders: DashboardOrder[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-soft">
          <tr>
            <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Number</th>
            <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Klient</th>
            <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Staatus</th>
            <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted text-right">Summa</th>
            <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Aeg</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr><td colSpan={5} className="p-8 text-center text-muted">Tellimusi ei leitud.</td></tr>
          ) : (
            orders.map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-soft/50 transition-colors">
                <td className="p-4">
                  <Link href={`/haldus/tellimused/${o.id}`} className="font-bold font-mono text-xs hover:text-accent">
                    {o.order_number}
                  </Link>
                </td>
                <td className="p-4">{o.customer_name}</td>
                <td className="p-4">
                  <StatusBadge variant={orderStatusVariant(o.status)} label={ORDER_STATUS_LABELS[o.status] ?? o.status} />
                </td>
                <td className="p-4 text-right font-bold">{formatEuro(o.total)}</td>
                <td className="p-4 text-muted text-xs">{new Date(o.created_at).toLocaleString("et-EE")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const salesCards = [
    { label: "Täna", ...data.sales.today },
    { label: "Viimased 7 päeva", ...data.sales.week },
    { label: "Viimased 30 päeva", ...data.sales.month },
  ];

  const stockCards = [
    { label: "Ootel tellimused", value: data.pendingOrders, href: "/haldus/tellimused", alert: data.pendingOrders > 0 },
    { label: "Madal laoseis", value: data.lowStockCount, href: "/haldus/tooted?status=low", alert: data.lowStockCount > 0 },
    { label: "Otsas", value: data.outOfStockCount, href: "/haldus/tooted?status=out", alert: data.outOfStockCount > 0 },
  ];

  const contentCards = [
    { label: "Aktiivsed tooted", value: data.activeProducts, href: "/haldus/tooted?tab=active" },
    { label: "Ilmumas", value: data.upcomingProducts, href: "/haldus/tooted?status=upcoming" },
    { label: "Avaldatud postitused", value: data.publishedPosts, href: "/haldus/blogi" },
    { label: "Mustandid", value: data.draftPosts, href: "/haldus/blogi" },
    { label: "Aktiivsed kampaaniad", value: data.activeCampaigns, href: "/haldus/kampaaniad" },
  ];

  return (
    <div>
      <h1 className="font-heading text-4xl mb-2">Ülevaade</h1>
      <p className="text-muted mb-8">Veebipoe müük, tellimused ja laoseis.</p>

      {/* Müügi KPI-d */}
      <div className="grid grid-cols-3 gap-5 mb-5 max-[900px]:grid-cols-1">
        {salesCards.map((card) => (
          <Link key={card.label} href="/haldus/tellimused" className="border border-line bg-panel p-6 hover:border-ink/30 transition-colors">
            <p className="text-muted text-sm font-bold">{card.label}</p>
            <p className="font-heading text-4xl mt-2">{formatEuro(card.revenue)}</p>
            <p className="text-muted text-sm mt-1">{card.orders} {card.orders === 1 ? "tellimus" : "tellimust"}</p>
          </Link>
        ))}
      </div>

      {/* Tähelepanu vajavad näitajad */}
      <div className="grid grid-cols-3 gap-5 mb-10 max-[900px]:grid-cols-1">
        {stockCards.map((card) => (
          <Link key={card.label} href={card.href} className={`border bg-panel p-6 transition-colors ${card.alert ? "border-amber-300 hover:border-amber-500" : "border-line hover:border-ink/30"}`}>
            <p className="text-muted text-sm font-bold">{card.label}</p>
            <p className={`font-heading text-4xl mt-2 ${card.alert ? "text-amber-700" : ""}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Viimased tellimused */}
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-heading text-2xl">Viimased tellimused</h2>
        <Link href="/haldus/tellimused" className="text-sm font-bold text-accent hover:underline">Kõik tellimused →</Link>
      </div>
      <div className="border border-line bg-panel mb-10">
        <RecentOrdersTable orders={data.recentOrders} />
      </div>

      {/* Laohoiatused + sisu */}
      <div className="grid grid-cols-2 gap-6 mb-10 max-[1100px]:grid-cols-1">
        <div className="border border-line bg-panel">
          <div className="p-6 border-b border-line flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-2xl">Laohoiatused</h2>
            <Link href="/haldus/tooted?status=low" className="text-sm font-bold text-accent hover:underline">Kõik →</Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="p-6 text-muted text-sm">Kõik aktiivsed tooted on piisavas laoseisus.</p>
          ) : (
            <ul>
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="border-b border-line last:border-b-0">
                  <Link href={`/haldus/tooted/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-soft/50 transition-colors">
                    {p.coverUrl ? (
                      <img src={p.coverUrl} alt="" className="w-8 h-11 object-cover border border-line flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 bg-soft border border-line flex-shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-sm truncate">{p.title}</span>
                      <span className="block text-xs text-muted font-mono">{p.sku}</span>
                    </span>
                    <StatusBadge variant="low" label={`Madal laoseis (${p.stock})`} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="p-4 border-t border-line text-sm">
            <Link href="/haldus/tooted?status=out" className="font-bold text-accent hover:underline">
              Otsas on {data.outOfStockCount} {data.outOfStockCount === 1 ? "toode" : "toodet"} →
            </Link>
          </div>
        </div>

        <div className="border border-line bg-panel">
          <div className="p-6 border-b border-line">
            <h2 className="font-heading text-2xl">Sisu</h2>
          </div>
          <ul>
            {contentCards.map((card) => (
              <li key={card.label} className="border-b border-line last:border-b-0">
                <Link href={card.href} className="flex items-center justify-between p-4 hover:bg-soft/50 transition-colors">
                  <span className="font-bold text-sm">{card.label}</span>
                  <span className="font-heading text-xl">{card.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Auditlogi (tehniline, vaikimisi peidus) */}
      <details className="border border-line bg-panel">
        <summary className="p-6 cursor-pointer font-heading text-2xl hover:bg-soft/50 transition-colors">
          Viimased tegevused (auditlogi)
        </summary>
        <table className="w-full text-left text-sm">
          <thead className="bg-soft">
            <tr>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Tegevus</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Ressurss</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">ID</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Aeg</th>
            </tr>
          </thead>
          <tbody>
            {data.auditEntries.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted">Tegevusi ei leitud.</td></tr>
            ) : (
              data.auditEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-line">
                  <td className="p-4 font-bold">{entry.action}</td>
                  <td className="p-4 text-muted">{entry.resource_type ?? ""}</td>
                  <td className="p-4 text-muted text-xs font-mono">{(entry.resource_id ?? "").slice(0, 12)}...</td>
                  <td className="p-4 text-muted text-xs">{entry.created_at ? new Date(entry.created_at).toLocaleString("et-EE") : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}
