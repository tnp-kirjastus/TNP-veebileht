import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CustomersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const db = createAdminClient();
  let builder = db.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);

  if (query) builder = builder.or(`email.ilike.%${query}%`);

  const { data: profiles } = await builder;

  return (
    <>
      <AdminPageHeader title="Kliendid" description="Kliendikontode haldamine ja tellimuste vaatamine." />

      <form className="mb-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
        <input type="search" name="q" defaultValue={query} placeholder="Otsi e-posti järgi…"
          className="flex-1 min-w-0 h-11 border border-line bg-paper px-4 outline-none text-sm" />
        <button type="submit" className="h-11 px-5 border border-line bg-soft text-sm font-bold hover:bg-line/30">Otsi</button>
      </form>

      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft">
            <tr>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">E-post</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Roll</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Loodud</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile: Record<string, unknown>) => (
              <tr key={String(profile.id)} className="border-t border-line hover:bg-soft/50">
                <td className="p-4 font-bold">{String(profile.email ?? "")}</td>
                <td className="p-4">
                  {profile.role === "admin" ? <StatusBadge variant="admin" /> :
                   profile.role === "editor" ? <StatusBadge variant="editor" /> :
                   profile.role === "viewer" ? <StatusBadge variant="viewer" /> :
                   <span className="text-xs text-muted">Klient</span>}
                </td>
                <td className="p-4 text-xs text-muted">
                  {profile.created_at ? new Date(String(profile.created_at)).toLocaleDateString("et-EE") : "\u2014"}
                </td>
                <td className="p-4">
                  <div className="flex gap-3 text-sm">
                    <button className="text-accent font-bold hover:underline">Vaata tellimusi</button>
                    {profile.role ? (String(profile.role) !== "admin" ? <button className="text-muted hover:text-ink font-bold">Halda</button> : null) : null}
                  </div>
                </td>
              </tr>
            ))}
            {(!profiles || profiles.length === 0) && (
              <tr><td colSpan={4} className="p-12 text-center text-muted">Kliente ei leitud.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted mt-3">
        Kliendihalduse täisfunktsionaalsus (registreerimine, tellimuste ajalugu, konto haldus) on arendamisel.
      </p>
    </>
  );
}
