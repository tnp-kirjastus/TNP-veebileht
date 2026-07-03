import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProducts } from "@/lib/data";
import { PersonForm } from "./PersonForm";

export default async function PeopleAdminPage() {
  const db = createAdminClient();
  const { data, count } = await db.schema("people").from("people").select("*", { count: "exact" }).order("name", { ascending: true }).limit(500);

  const activeProducts = getActiveProducts();
  const authorCounts = new Map<string, number>();
  for (const p of activeProducts) {
    for (const name of p.people.author || []) {
      authorCounts.set(name, (authorCounts.get(name) || 0) + 1);
    }
  }

  const peopleWithBooks = (data ?? []).filter((p: Record<string, unknown>) => {
    const name = String(p.name ?? "");
    return authorCounts.has(name);
  });

  return (
    <>
      <AdminPageHeader title="Autorid" description={`${peopleWithBooks.length} autorit aktiivsete raamatutega (kokku ${count ?? 0} andmebaasis).`} />
      <PersonForm />
      <div className="mt-8 grid gap-3">
        {peopleWithBooks.map((p: Record<string, unknown>) => {
          const name = String(p.name ?? "");
          const bookCount = authorCounts.get(name) || 0;
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
