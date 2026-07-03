import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
import { PersonForm } from "./PersonForm";

export default async function PeopleAdminPage() {
  const db = createAdminClient();
  const { data, count } = await db.schema("people").from("people").select("*", { count: "exact" }).order("name", { ascending: true }).limit(200);

  return (
    <>
      <AdminPageHeader title="Autorid" description={`${count ?? 0} inimest (kuvatakse esimesed 200).`} />
      <PersonForm />
      <div className="mt-8 grid gap-3">
        {(data ?? []).map((p: Record<string, unknown>) => (
          <div key={String(p.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div>
              <span className="font-bold">{String(p.name ?? "")}</span>
              <span className="text-xs text-muted font-mono ml-3">{String(p.slug ?? "")}</span>
            </div>
            <Link href={`/raamatud?author=${encodeURIComponent(String(p.slug ?? p.name ?? ""))}`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
          </div>
        ))}
      </div>
    </>
  );
}
