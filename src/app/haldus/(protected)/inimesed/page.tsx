import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { PersonForm } from "./PersonForm";

export default async function PeopleAdminPage() {
  const db = createAdminClient();

  const { data: people, count } = await db.schema("people").from("people").select("*", { count: "exact" }).order("name", { ascending: true }).limit(500);

  const activeIds: string[] = [];
  let aiFrom = 0;
  const aiSize = 1000;
  while (true) {
    const { data } = await db.schema("commerce").from("products").select("id").eq("is_archived", false).range(aiFrom, aiFrom + aiSize - 1);
    if (!data || data.length === 0) break;
    for (const p of data as Record<string, unknown>[]) activeIds.push(String(p.id));
    if (data.length < aiSize) break;
    aiFrom += aiSize;
  }
  const activeIdSet = new Set(activeIds);

  const authorCounts = new Map<string, number>();
  let ppFrom = 0;
  const ppSize = 1000;
  while (true) {
    const { data: ppRows } = await db.schema("commerce").from("product_people").select("product_id, person_id").eq("role", "author").range(ppFrom, ppFrom + ppSize - 1);
    if (!ppRows || ppRows.length === 0) break;
    for (const row of ppRows as Record<string, unknown>[]) {
      if (activeIdSet.has(String(row.product_id ?? ""))) {
        const personId = String(row.person_id ?? "");
        authorCounts.set(personId, (authorCounts.get(personId) || 0) + 1);
      }
    }
    if (ppRows.length < ppSize) break;
    ppFrom += ppSize;
  }

  const peopleWithBooks = (people ?? []).filter((p: Record<string, unknown>) => authorCounts.has(String(p.id)));

  return (
    <>
      <AdminPageHeader title="Autorid" description={`${peopleWithBooks.length} autorit aktiivsete raamatutega (kokku ${count ?? 0} andmebaasis).`} />
      <PersonForm />
      <div className="mt-8 grid gap-3">
        {peopleWithBooks.map((p: Record<string, unknown>) => {
          const name = String(p.name ?? "");
          const bookCount = authorCounts.get(String(p.id)) || 0;
          return (
          <div key={String(p.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{name}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(p.slug ?? "")}</span>
              <span className="text-xs text-muted ml-2">· {bookCount} raamatut</span>
            </div>
            <Link href={`/raamatud?author=${encodeURIComponent(String(p.slug ?? p.name ?? ""))}`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
          </div>
          );
        })}
      </div>
    </>
  );
}
