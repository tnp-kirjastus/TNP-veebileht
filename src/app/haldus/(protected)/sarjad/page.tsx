import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { SeriesForm } from "./SeriesForm";

export default async function SeriesAdminPage() {
  const db = createAdminClient();
  const { data: series, count } = await db.schema("content").from("series").select("*", { count: "exact" }).order("name_et", { ascending: true });

  const seriesCounts = new Map<string, number>();
  let pFrom = 0;
  const pSize = 1000;
  while (true) {
    const { data: products } = await db.schema("commerce").from("products")
      .select("series_id").eq("is_archived", false).not("series_id", "is", null)
      .range(pFrom, pFrom + pSize - 1);
    if (!products || products.length === 0) break;
    for (const p of products as Record<string, unknown>[]) {
      const sid = String(p.series_id ?? "");
      if (sid) seriesCounts.set(sid, (seriesCounts.get(sid) || 0) + 1);
    }
    if (products.length < pSize) break;
    pFrom += pSize;
  }

  return (
    <>
      <AdminPageHeader title="Sarjad" description={`${count ?? 0} sarja.`} />
      <SeriesForm />
      <div className="mt-8 grid gap-3">
        {(series ?? []).map((s: Record<string, unknown>) => {
          const bookCount = seriesCounts.get(String(s.id)) || 0;
          return (
          <div key={String(s.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{String(s.name_et ?? "")}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(s.slug ?? "")}</span>
              <span className="text-xs text-muted ml-2">· {bookCount} raamatut</span>
            </div>
            <div className="flex items-center gap-4">
              {s.cover_image ? <span className="text-xs text-muted">Pilt: {String(s.cover_image)}</span> : null}
              <Link href={`/sarjad/${String(s.slug ?? "")}`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
