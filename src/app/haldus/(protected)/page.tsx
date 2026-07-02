import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const db = createAdminClient();
  const [active, upcoming, posts, pendingOrders] = await Promise.all([
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_upcoming", true).eq("is_archived", false),
    db.schema("content").from("posts").select("id", { count: "exact", head: true }),
    db.schema("commerce").from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "payment_pending"]),
  ]);
  const cards = [["Aktiivsed tooted", active.count], ["Ilmumas", upcoming.count], ["Blogipostitused", posts.count], ["Ootel tellimused", pendingOrders.count]];
  return <><div className="flex items-end justify-between gap-4"><div><h1 className="font-heading text-5xl">Ülevaade</h1><p className="text-muted mt-3">Veebipoe sisu ja töövood.</p></div></div><div className="grid grid-cols-4 gap-5 mt-8 max-[1100px]:grid-cols-2 max-sm:grid-cols-1">{cards.map(([label, count]) => <section key={String(label)} className="border border-line bg-panel p-6"><p className="text-muted text-sm font-bold">{label}</p><p className="font-heading text-4xl mt-2">{count ?? "—"}</p></section>)}</div></>;
}

