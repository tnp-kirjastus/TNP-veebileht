import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryForm } from "./CategoryForm";
import { AdminSkeleton } from "@/components/admin/AdminStates";

export default async function CategoriesAdminPage() {
  const db = createAdminClient();
  const { data, count } = await db.schema("commerce").from("categories").select("*", { count: "exact" }).order("sort_order", { ascending: true });

  return (
    <>
      <AdminPageHeader title="Kategooriad" description={`${count ?? 0} kategooriat.`} />
      <CategoryForm />
      <div className="mt-8 grid gap-2">
        {(data ?? []).map((c: Record<string, unknown>, i: number) => (
          <div key={String(c.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{String(c.name_et ?? "")}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(c.slug ?? "")}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted">Jrk: {Number(c.sort_order ?? i)}</span>
              <Link href={`/raamatud?category=${encodeURIComponent(String(c.slug ?? ""))}`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
