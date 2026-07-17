import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuro } from "@/lib/product-utils";

interface ProductRow {
  id: string;
  sku: string;
  title: string;
  price: number;
  salePrice: number | null;
  stock: number;
  archived: boolean;
  upcoming: boolean;
  isOnSale: boolean;
  dateCell: string;
}

export default async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; origin?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const query = (params.q ?? "").trim();
  const statusFilter = params.status ?? "";
  const originFilter = params.origin ?? "";
  const activeTab = params.tab ?? "all";
  const perPage = 25;
  const from = (page - 1) * perPage;

  const db = createAdminClient();

  let builder = db.schema("commerce").from("products").select("id,sku,title_et,slug,price,sale_price,stock,release_date,is_upcoming,is_archived", { count: "exact" });

  if (query) {
    builder = builder.or(`title_et.ilike.%${query}%,sku.ilike.%${query}%`);
  }

  if (activeTab === "archived") {
    builder = builder.eq("is_archived", true);
  } else if (activeTab === "all") {
    // no filter
  } else {
    builder = builder.eq("is_archived", false).eq("is_upcoming", false);
  }

  if (statusFilter === "upcoming") builder = builder.eq("is_upcoming", true).eq("is_archived", false);
  else if (statusFilter === "archived") builder = builder.eq("is_archived", true);
  else if (statusFilter === "sale") builder = builder.not("sale_price", "is", null);

  if (originFilter) builder = builder.eq("origin", originFilter);

  const { data, count } = await builder.order("title_et", { ascending: true }).range(from, from + perPage - 1);

  const products: ProductRow[] = (data ?? []).map((p: Record<string, unknown>) => {
    const salePrice = p.sale_price != null ? Number(p.sale_price) : null;
    const price = Number(p.price ?? 0);
    const stock = Number(p.stock ?? 0);
    const archived = Boolean(p.is_archived);
    const upcoming = Boolean(p.is_upcoming);
    const isOnSale = salePrice != null && salePrice < price;

    return {
      id: String(p.id),
      sku: String(p.sku ?? ""),
      title: String(p.title_et ?? ""),
      price,
      salePrice,
      stock,
      archived,
      upcoming,
      isOnSale,
      dateCell: p.release_date
        ? new Date(String(p.release_date)).toLocaleDateString("et-EE")
        : "—",
    };
  });

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  function buildHref(overrides: Record<string, string>) {
    const parts: string[] = [];
    const q = overrides.q ?? query;
    const s = overrides.status ?? statusFilter;
    const o = overrides.origin ?? originFilter;
    const pg = overrides.page ?? String(page);
    const t = overrides.tab ?? activeTab;
    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (s) parts.push(`status=${encodeURIComponent(s)}`);
    if (o) parts.push(`origin=${encodeURIComponent(o)}`);
    if (t && t !== "all") parts.push(`tab=${encodeURIComponent(t)}`);
    if (pg && Number(pg) > 1) parts.push(`page=${encodeURIComponent(pg)}`);
    return `/haldus/tooted${parts.length ? "?" + parts.join("&") : ""}`;
  }

  function statusVariant(product: ProductRow): "archived" | "upcoming" | "sale" | "active" {
    if (product.archived) return "archived";
    if (product.upcoming) return "upcoming";
    if (product.isOnSale) return "sale";
    return "active";
  }

  return (
    <>
      <AdminPageHeader
        title="Tooted"
        description={`${totalCount} toodet kataloogis.`}
        action={
          <div className="flex gap-3">
            <Link href="/haldus/tooted/partii" className="inline-flex items-center gap-2 min-h-12 px-6 border border-line font-bold hover:bg-soft transition-colors">
              Partii muutmine
            </Link>
            <Link href="/haldus/tooted/uus" className="inline-flex items-center gap-2 min-h-12 px-6 border border-accent bg-white text-accent font-bold hover:bg-accent hover:text-white transition-colors">
              + Uus toode
            </Link>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex border-b border-line mb-6">
        <Link href={buildHref({ tab: "active", page: "1", status: "", origin: "" })}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === "active" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          Aktiivsed
        </Link>
        <Link href={buildHref({ tab: "archived", page: "1", status: "", origin: "" })}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === "archived" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          Arhiveeritud
        </Link>
        <Link href={buildHref({ tab: "all", page: "1", status: "", origin: "" })}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === "all" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
          Kõik tooted
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
        <input type="search" name="q" defaultValue={query} placeholder="Otsi pealkirja, ISBN-i või URL-i nime järgi…"
          className="flex-1 min-w-0 h-11 border border-line bg-paper px-4 outline-none text-sm" />
        <select name="status" defaultValue={statusFilter} className="h-11 border border-line bg-paper px-3 text-sm font-bold">
          <option value="">Kõik olekud</option>
          <option value="sale">Soodus</option>
        </select>
        <select name="origin" defaultValue={originFilter} className="h-11 border border-line bg-paper px-3 text-sm font-bold">
          <option value="">Kõik päritolud</option>
          <option value="estonian">Eesti</option>
          <option value="foreign">Välismaine</option>
        </select>
        <input type="hidden" name="tab" value={activeTab} />
        <button type="submit" className="h-11 px-5 border border-line bg-soft text-sm font-bold hover:bg-line/30">Filtreeri</button>
        {(query || statusFilter || originFilter) && (
          <Link href={buildHref({ tab: activeTab, page: "1", status: "", origin: "", q: "" })} className="h-11 px-4 inline-flex items-center text-sm text-muted hover:text-ink font-bold">Tühista</Link>
        )}
      </form>

      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft">
            <tr>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Raamat</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Hind</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Ladu</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Olek</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Ilmumine</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted">Ühtki toodet ei leitud.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-line hover:bg-soft/50 transition-colors">
                  <td className="p-4">
                    <Link href={`/haldus/tooted/${p.id}`} className="font-bold hover:text-accent">{p.title}</Link>
                    <div className="text-xs text-muted mt-0.5">{p.sku}</div>
                  </td>
                  <td className="p-4">
                    {p.isOnSale && p.salePrice !== null ? (
                      <>
                        <span className="text-muted line-through text-xs">{formatEuro(p.price)}</span>
                        <span className="text-accent font-bold ml-2">{formatEuro(p.salePrice)}</span>
                      </>
                    ) : (
                      <span className="font-bold">{formatEuro(p.price)}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {p.archived || p.stock === 0 || p.stock <= 5 ? (
                      <StatusBadge variant={statusVariant(p)} />
                    ) : (
                      p.stock
                    )}
                  </td>
                  <td className="p-4"><StatusBadge variant={statusVariant(p)} /></td>
                  <td className="p-4 text-xs text-muted">{p.dateCell}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
          <p className="text-xs text-muted">Lehekülg {page} / {totalPages} ({totalCount} toodet)</p>
          <div className="flex gap-1">
            {page > 1 && <Link href={buildHref({ page: String(page - 1) })} className="px-4 py-2 border border-line text-sm font-bold hover:bg-soft">← Eelmine</Link>}
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pageNum = page <= 4 ? i + 1 : page + i - 3;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Link key={pageNum} href={buildHref(pageNum === 1 ? {} : { page: String(pageNum) })}
                  className={`px-4 py-2 border text-sm font-bold ${pageNum === page ? "border-ink bg-white text-ink" : "border-line hover:bg-soft"}`}>
                  {pageNum}
                </Link>
              );
            })}
            {page < totalPages && <Link href={buildHref({ page: String(page + 1) })} className="px-4 py-2 border border-line text-sm font-bold hover:bg-soft">Järgmine →</Link>}
          </div>
        </div>
      )}
    </>
  );
}
