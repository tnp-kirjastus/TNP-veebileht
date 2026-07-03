import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeriesForm } from "./SeriesForm";

export default async function SeriesAdminPage() {
  const db = createAdminClient();
  const { data, count } = await db.schema("content").from("series").select("*", { count: "exact" }).order("name_et", { ascending: true });

  return (
    <>
      <AdminPageHeader title="Sarjad" description={`${count ?? 0} sarja.`} />
      <SeriesForm />
      <div className="mt-8 grid gap-3">
        {(data ?? []).map((s: Record<string, unknown>) => (
          <div key={String(s.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{String(s.name_et ?? "")}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(s.slug ?? "")}</span>
            </div>
            {s.cover_image ? <span className="text-xs text-muted">Pilt: {String(s.cover_image)}</span> : null}
          </div>
        ))}
      </div>
    </>
  );
}
