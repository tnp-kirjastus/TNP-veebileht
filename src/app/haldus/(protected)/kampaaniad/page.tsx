<<<<<<< HEAD
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CampaignsPageClient } from "./CampaignsPageClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSaleProducts, getSalePercent } from "@/lib/data";
import { requireAdminSession } from "@/lib/admin-auth";

export interface CampaignGroup {
  key: string;
  label: string;
  sublabel: string;
  sortDate: string;
  products: {
    sku: string;
    title_et: string;
    price: number;
    sale_price: number;
    sale_start: string | null;
    sale_end: string | null;
    slug: string;
  }[];
}

function groupKey(sale_start: string | null, sale_end: string | null) {
  return `${sale_start ?? "always"}|${sale_end ?? "open"}`;
}

export default async function CampaignsAdminPage() {
  const session = await requireAdminSession();
  const db = createAdminClient();

  const allProducts: {
    id: string;
    sku: string;
    title_et: string;
    price: number;
    sale_price: number | null;
  }[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data } = await db
      .schema("commerce")
      .from("products")
      .select("id, sku, title_et, price, sale_price")
      .eq("is_archived", false)
      .order("title_et", { ascending: true })
      .range(from, from + size - 1);
    if (!data || data.length === 0) break;
    allProducts.push(...(data as typeof allProducts));
    if (data.length < size) break;
    from += size;
  }

  const saleProducts = getSaleProducts().sort(
    (a, b) => getSalePercent(b) - getSalePercent(a) || a.title_et.localeCompare(b.title_et, "et")
  );
  const rawGroups = Map.groupBy(saleProducts, (p) => groupKey(p.sale_start, p.sale_end));
  const autoGroups: CampaignGroup[] = [...rawGroups.entries()]
    .map(([key, prods]) => {
      const [start, end] = key.split("|");
      const persistent = start === "always" && end === "open";
      const label = persistent
        ? "Püsivalt soodsad"
        : `Kampaania ${new Date(start!).toLocaleDateString("et-EE")} – ${end === "open" ? "tähtajatu" : new Date(end!).toLocaleDateString("et-EE")}`;
      const sublabel = persistent ? "Püsiv pakkumine" : "Hooajaline kampaania";
      const sortDate = persistent ? "0000" : start!;
      return {
        key,
        label,
        sublabel,
        sortDate,
        products: prods.map((p) => ({
          sku: p.sku,
          title_et: p.title_et,
          price: Number(p.price),
          sale_price: Number(p.sale_price!),
          sale_start: p.sale_start,
          sale_end: p.sale_end,
          slug: p.slug,
        })),
      };
    })
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  const { data: campaigns, count } = await db
    .schema("content")
    .from("campaigns")
    .select("*, campaign_products(product_id)", { count: "exact" })
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <>
      <AdminPageHeader
        title="Kampaaniad"
        description={`${count ?? 0} kampaania. Tootekataloogis ${autoGroups.length} sooduskampaaniat.`}
      />
      <CampaignsPageClient
        campaigns={(campaigns ?? []) as Record<string, unknown>[]}
        products={allProducts}
        autoGroups={autoGroups}
        canDelete={session.role === "admin"}
      />
=======
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
          <p className="text-muted py-8 text-center">Aktiivseid kampaaniaid pole veel loodud. Kasuta üleval vormi esimese kampaania lisamiseks.</p>
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
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
    </>
  );
}
