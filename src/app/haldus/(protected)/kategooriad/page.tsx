import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryForm } from "./CategoryForm";
<<<<<<< HEAD

export default async function CategoriesAdminPage() {
  const db = createAdminClient();
  const { data: categories, count } = await db.schema("commerce").from("categories").select("*", { count: "exact" }).order("sort_order", { ascending: true });

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

  const catCounts = new Map<string, number>();
  let pcFrom = 0;
  const pcSize = 1000;
  while (true) {
    const { data: pcRows } = await db.schema("commerce").from("product_categories").select("product_id, category_id").range(pcFrom, pcFrom + pcSize - 1);
    if (!pcRows || pcRows.length === 0) break;
    for (const row of pcRows as Record<string, unknown>[]) {
      if (activeIdSet.has(String(row.product_id ?? ""))) {
        const cid = String(row.category_id ?? "");
        if (cid) catCounts.set(cid, (catCounts.get(cid) || 0) + 1);
      }
    }
    if (pcRows.length < pcSize) break;
    pcFrom += pcSize;
  }
=======
import { AdminSkeleton } from "@/components/admin/AdminStates";

export default async function CategoriesAdminPage() {
  const db = createAdminClient();
  const { data, count } = await db.schema("commerce").from("categories").select("*", { count: "exact" }).order("sort_order", { ascending: true });
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

  return (
    <>
      <AdminPageHeader title="Kategooriad" description={`${count ?? 0} kategooriat.`} />
      <CategoryForm />
      <div className="mt-8 grid gap-2">
<<<<<<< HEAD
        {(categories ?? []).map((c: Record<string, unknown>, i: number) => {
          const bookCount = catCounts.get(String(c.id)) || 0;
          return (
=======
        {(data ?? []).map((c: Record<string, unknown>, i: number) => (
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          <div key={String(c.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{String(c.name_et ?? "")}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(c.slug ?? "")}</span>
<<<<<<< HEAD
              <span className="text-xs text-muted ml-2">· {bookCount} raamatut</span>
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted">Jrk: {Number(c.sort_order ?? i)}</span>
              <Link href={`/raamatud?category=${encodeURIComponent(String(c.slug ?? ""))}`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
            </div>
          </div>
<<<<<<< HEAD
          );
        })}
=======
        ))}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      </div>
    </>
  );
}
