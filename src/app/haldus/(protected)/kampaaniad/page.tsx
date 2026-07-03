import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CampaignForm } from "./CampaignForm";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CampaignsAdminPage() {
  const db = createAdminClient();
  const { data: campaigns, count } = await db.schema("content").from("campaigns").select("*", { count: "exact" }).order("starts_at", { ascending: false }).limit(50);

  return (
    <>
      <AdminPageHeader title="Kampaaniad" description={`${count ?? 0} kampaania.`} />
      <CampaignForm />
      <div className="mt-8">
        {(campaigns ?? []).length === 0 ? (
          <p className="text-muted py-8 text-center">Aktiivseid kampaaniaid pole veel loodud. Kasuta \u00fcleval vormi esimese kampaania lisamiseks.</p>
        ) : (
          <div className="grid gap-3">
              {(campaigns ?? []).map((c: Record<string, unknown>) => {
                const isActive = Boolean(c.is_active);
                return (
              <div key={String(c.id)} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
                <div>
                  <span className="font-bold">{String(c.name_et ?? "")}</span>
                  <span className="text-xs text-muted font-mono ml-3">{String(c.slug ?? "")}</span>
                  {isActive ? <StatusBadge variant="active" /> : <StatusBadge variant="draft" />}
                </div>
                <div className="flex items-center gap-4">
                  {c.starts_at != null && <span className="text-xs text-muted">{new Date(String(c.starts_at)).toLocaleDateString("et-EE")} – {c.ends_at ? new Date(String(c.ends_at)).toLocaleDateString("et-EE") : "tähtajatu"}</span>}
                  <Link href={`/raamatud?sale=true`} className="text-accent font-bold text-sm hover:underline">Vaata raamatuid →</Link>
                </div>
              </div>
                );
              })}
          </div>
        )}
      </div>
    </>
  );
}
