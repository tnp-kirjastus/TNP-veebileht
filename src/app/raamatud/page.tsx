import { Suspense } from "react";
import { LayoutFull, Shell } from "@/components/layout";
import { FilterSidebar } from "@/components/store/FilterSidebar";
import { ProductGrid } from "@/components/store/ProductGrid";
import { SortSelect } from "@/components/store/SortSelect";
// Breadcrumbs removed per client request (task 17)
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { t } from "@/lib/translations";
import Link from "next/link";
import type { Metadata } from "next";
import { filterProductsByPerson, getCatalogueProducts, searchProducts, getCategoryTree, getProductsByCategories, isOnSale, getSalePercent, type Product } from "@/lib/data";

export const revalidate = 3600;

interface SearchParams {
  q?: string; category?: string | string[]; origin?: string; sale?: string; upcoming?: string; archive?: string; archived?: string;
  author?: string; translator?: string; designer?: string; illustrator?: string; editor?: string;
  sort?: string; page?: string; sale_start?: string; sale_end?: string;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const params = await searchParams;
  const categoryList = params.category ? (Array.isArray(params.category) ? params.category : [params.category]) : [];
  const hasFilters = !!(params.q || params.sort || params.page || params.origin || params.sale || params.upcoming || params.archive || params.archived || params.author || params.translator || params.designer || params.illustrator || params.editor || categoryList.length > 0);
  const canonicalPath = categoryList.length > 0 ? `/raamatud?${categoryList.map(c => `category=${encodeURIComponent(c)}`).join("&")}` : "/raamatud";
  return {
    title: params.q ? `Otsing: ${params.q}` : categoryList.length > 0 ? `${categoryList.join(", ")} — Raamatud` : "Raamatud",
    description: "Sirvi raamatuid kategooriate, autorite ja pakkumiste järgi.",
    robots: params.q ? { index: false, follow: true } : undefined,
    alternates: hasFilters ? { canonical: canonicalPath } : undefined,
  };
}

const CATEGORY_TREE = getCategoryTree().map((category, index) => ({
  id: String(index + 1), slug: category.slug, name_et: category.name,
  children: category.children?.map((child, ci) => ({
    id: `${index + 1}-${ci + 1}`, slug: child.slug, name_et: child.name,
    children: child.children?.map((cc, cci) => ({
      id: `${index + 1}-${ci + 1}-${cci + 1}`, slug: cc.slug, name_et: cc.name,
    })),
  })),
}));

function mapProduct(p: Product) {
  const onSale = isOnSale(p);
  return { slug: p.slug, title: p.title_et, author: p.people.author?.join(", ") || "", price: p.price, salePrice: p.sale_price, effectivePrice: onSale ? p.sale_price! : p.price, coverImage: p.cover_image, isUpcoming: p.is_upcoming, isOnSale: onSale, salePercent: getSalePercent(p), isArchived: p.is_archived };
}

function buildPageHref(params: SearchParams, page: number) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach((val) => sp.append(k, val));
    } else {
      sp.set(k, String(v));
    }
  });
  sp.set("page", String(page));
  return `/raamatud?${sp.toString()}`;
}

function BooksContent({ params }: { params: SearchParams }) {
  const showArchived = params.archive === "true" || params.archived === "true";
  const productScope = showArchived ? "archived" : "active";
  let results = params.q?.trim() ? searchProducts(params.q.trim(), productScope) : getCatalogueProducts(productScope);

  if (params.category) {
    const categorySlugs = Array.isArray(params.category) ? params.category : [params.category];
    const catFilteredIds = new Set(getProductsByCategories(categorySlugs, productScope).map((p) => p.id));
    results = results.filter((p) => catFilteredIds.has(p.id));
  }
  if (params.sale_start !== undefined && params.sale_end !== undefined) {
    if (params.sale_start === "always" && params.sale_end === "open") {
      results = results.filter((p) => p.sale_price != null && p.sale_start === null && p.sale_end === null);
    } else {
      results = results.filter((p) => p.sale_price != null && p.sale_start === params.sale_start && p.sale_end === params.sale_end);
    }
  } else if (params.sale === "true") {
    results = results.filter(isOnSale);
  }
  if (params.upcoming === "true") results = results.filter((product) => product.is_upcoming);

  if (params.origin === "estonian") results = results.filter(p => p.origin === "estonian");
  if (params.origin === "foreign") results = results.filter(p => p.origin === "foreign");
  for (const role of ["author", "translator", "designer", "illustrator", "editor"] as const) {
    const value = params[role];
    if (value) results = filterProductsByPerson(results, role, value);
  }

  const sort = params.sort || "newest";
  results = [...results].sort((a, b) => {
    switch (sort) { case "price-asc": return (isOnSale(a) ? a.sale_price! : a.price) - (isOnSale(b) ? b.sale_price! : b.price); case "price-desc": return (isOnSale(b) ? b.sale_price! : b.price) - (isOnSale(a) ? a.sale_price! : a.price); case "az": return a.title_et.localeCompare(b.title_et, "et"); case "za": return b.title_et.localeCompare(a.title_et, "et"); case "oldest": return (a.release_date || "").localeCompare(b.release_date || ""); default: return (b.release_date || "").localeCompare(a.release_date || ""); }
  });

  const parsedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const pageSize = 24, totalCount = results.length, totalPages = Math.ceil(totalCount / pageSize);
  const paged = results.slice((page - 1) * pageSize, page * pageSize);

  const activeLabel = params.q ? `Otsing: "${params.q}"`
    : showArchived
      ? "Läbimüüdud"
    : (params.sale_start !== undefined && params.sale_end !== undefined)
      ? (params.sale_start === "always" && params.sale_end === "open"
          ? "Püsivalt soodsad"
          : `Otsing: ${new Date(params.sale_start).toLocaleDateString("et-EE")} – ${new Date(params.sale_end).toLocaleDateString("et-EE")}`)
    : params.category
      ? (() => {
          const slugs = Array.isArray(params.category) ? params.category : [params.category];
          return slugs.map(s => CATEGORY_TREE.find(c => c.slug === s || c.children?.some(cc => cc.slug === s))?.name_et || s).join(", ");
        })()
    : t.books.title;

  return (
    <LayoutFull>
      <section className="py-[28px]">
        <Shell>
          <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none">{params.q ? `Otsing: "${params.q}"` : activeLabel}</h1>
        </Shell>
      </section>

      <Shell>
        <div className="grid grid-cols-[260px_1fr] gap-[38px] pt-8 pb-10 max-[880px]:grid-cols-1">
          <aside className="self-start sticky top-[116px] max-[880px]:relative max-[880px]:top-0">
            <FilterSidebar categories={CATEGORY_TREE} currentParams={params as Record<string, string | string[] | undefined>} />
          </aside>
          <section>
            <div className="grid grid-cols-[1fr_auto] items-center gap-[18px] mb-[22px] max-[640px]:grid-cols-1">
              <p className="text-muted">{activeLabel} · {totalCount} {t.books.count}</p>
              <Suspense><SortSelect /></Suspense>
            </div>

            {paged.length > 0 ? <ProductGrid products={paged.map(mapProduct)} columns={4} /> : (
              <div className="p-[60px] border border-dashed border-line text-center">
                <p className="text-xl font-heading mb-3">{t.common.no_results}</p>
                {params.q && <p className="text-muted mb-6">{t.books.search_no_results}</p>}
                <Link href="/raamatud" className="inline-block text-accent font-bold hover:underline">{t.books.view_all} →</Link>
              </div>
            )}

            {totalPages > 1 && (
              <nav className="flex flex-wrap justify-center items-center gap-2 py-8" aria-label="Pagination">
                {page > 1 && <Link href={buildPageHref(params, page - 1)} className="px-4 py-2 border border-line hover:bg-soft font-bold">← Eelmine</Link>}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = Math.max(1, page - 3) + i; if (p > totalPages) return null;
                  return <Link key={p} href={buildPageHref(params, p)} className={`px-3 py-2 font-bold border ${p === page ? "border-ink bg-white text-ink" : "border-transparent hover:text-accent"}`}>{p}</Link>;
                })}
                {page < totalPages && <Link href={buildPageHref(params, page + 1)} className="px-4 py-2 border border-line hover:bg-soft font-bold">Järgmine →</Link>}
              </nav>
            )}
          </section>
        </div>
      </Shell>
      <NewsletterSection />
    </LayoutFull>
  );
}

export default async function BooksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <BooksContent params={params} />;
}
