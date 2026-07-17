import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  const db = createAdminClient();

  const results = await Promise.allSettled([
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_upcoming", true).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).lte("stock", 5).gt("stock", 0).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("stock", 0).eq("is_archived", false),
    db.schema("content").from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    db.schema("content").from("posts").select("id", { count: "exact", head: true }).eq("is_published", false),
    db.schema("content").from("campaigns").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.schema("commerce").from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "payment_pending"]),
    db.schema("system").from("audit_log").select("id,action,resource_type,resource_id,created_at").order("created_at", { ascending: false }).limit(10),
  ]);

<<<<<<< HEAD
  function c(result: unknown) { if (result && typeof result === "object" && "status" in result && (result as Record<string, unknown>).status === "fulfilled") { const v = (result as { value?: { count?: number } }).value; if (v && typeof v.count === "number") return v.count; } return 0; }
=======
  function c(v: unknown) { return (v && typeof v === "object" && "count" in v) ? (v as { count: number }).count : 0; }
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  const stats = [
    { label: "Aktiivsed tooted", value: c(results[0]), href: "/haldus/tooted" },
    { label: "Ilmumas", value: c(results[1]), href: "/haldus/tooted?status=upcoming" },
    { label: "Madal laoseis", value: c(results[2]), href: "/haldus/tooted" },
    { label: "Otsas", value: c(results[3]), href: "/haldus/tooted" },
    { label: "Avaldatud postitused", value: c(results[4]), href: "/haldus/blogi" },
    { label: "Mustandid", value: c(results[5]), href: "/haldus/blogi" },
    { label: "Aktiivsed kampaaniad", value: c(results[6]), href: "/haldus/kampaaniad" },
    { label: "Ootel tellimused", value: c(results[7]), href: "/haldus/tellimused" },
  ];

  const auditRaw = results[8].status === "fulfilled" ? results[8].value : null;
  const auditEntries = (auditRaw && typeof auditRaw === "object" && "data" in auditRaw) ? (auditRaw as { data: Array<Record<string, unknown>> }).data : null;

  return (
    <div>
      <h1 className="font-heading text-4xl mb-2">Ülevaade</h1>
      <p className="text-muted mb-8">Veebipoe sisu ja tellimused.</p>

      <div className="grid grid-cols-4 gap-5 mb-10 max-[1100px]:grid-cols-2 max-sm:grid-cols-1">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href ?? "#"} className="border border-line bg-panel p-6 hover:border-ink/30 transition-colors">
            <p className="text-muted text-sm font-bold">{stat.label}</p>
            <p className="font-heading text-4xl mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>

      <h2 className="font-heading text-2xl mb-4">Viimased tegevused</h2>
      <div className="border border-line bg-panel">
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
            {!auditEntries || auditEntries.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted">Tegevusi ei leitud.</td></tr>
            ) : (
              auditEntries.map((entry: Record<string, unknown>) => (
                <tr key={String(entry.id)} className="border-t border-line">
                  <td className="p-4 font-bold">{String(entry.action ?? "")}</td>
                  <td className="p-4 text-muted">{String(entry.resource_type ?? "")}</td>
                  <td className="p-4 text-muted text-xs font-mono">{String(entry.resource_id ?? "").slice(0, 12)}...</td>
                  <td className="p-4 text-muted text-xs">{entry.created_at ? new Date(String(entry.created_at)).toLocaleString("et-EE") : ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
