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
import { getCategoryTree, searchCatalogue } from "@/lib/db/catalog";
import { isOnSale, getSalePercent } from "@/lib/product-utils";
import type { Product } from "@/lib/data-types";

// Kataloog loeb otse andmebaasist — admini muudatused peegelduvad kohe.
export const dynamic = "force-dynamic";

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

const PERSON_ROLES = ["author", "translator", "designer", "illustrator", "editor"] as const;

async function BooksContent({ params }: { params: SearchParams }) {
  const showArchived = params.archive === "true" || params.archived === "true";
  const categoryList = params.category ? (Array.isArray(params.category) ? params.category : [params.category]) : [];

  const people: Record<string, string> = {};
  for (const role of PERSON_ROLES) {
    const value = params[role];
    if (value) people[role] = value;
  }

  const parsedPage = Number.parseInt(params.page || "1", 10);

  const [categoryTree, result] = await Promise.all([
    getCategoryTree(),
    searchCatalogue({
      q: params.q?.trim() || undefined,
      categories: categoryList.length ? categoryList : undefined,
      origin: params.origin === "estonian" || params.origin === "foreign" ? params.origin : undefined,
      sale: params.sale === "true" || params.sale_start !== undefined || params.sale_end !== undefined,
      upcoming: params.upcoming === "true",
      people: Object.keys(people).length ? people : undefined,
      saleStart: params.sale_start && params.sale_start !== "always" ? params.sale_start : undefined,
      saleEnd: params.sale_end && params.sale_end !== "open" ? params.sale_end : undefined,
      saleOpen: params.sale_start === "always" && params.sale_end === "open",
      scope: showArchived ? "archived" : "active",
      sort: params.sort || "newest",
      page: Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1,
      pageSize: 24,
    }),
  ]);

  const { products, totalCount, page, totalPages } = result;

  // "arhiiv" kategooriat külgpaneelis ei kuvata — arhiiviraamatuid filtreerib
  // eraldi "Arhiiv / läbimüüdud" lüliti (scope=archived), kategooria ise on tühi.
  const categoryTreeForSidebar = categoryTree
    .filter((category) => category.slug !== "arhiiv")
    .map((category, index) => ({
      id: String(index + 1), slug: category.slug, name_et: category.name,
      children: category.children?.map((child, ci) => ({
        id: `${index + 1}-${ci + 1}`, slug: child.slug, name_et: child.name,
        children: child.children?.map((cc, cci) => ({
          id: `${index + 1}-${ci + 1}-${cci + 1}`, slug: cc.slug, name_et: cc.name,
        })),
      })),
    }));

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
          return slugs.map(s => categoryTreeForSidebar.find(c => c.slug === s || c.children?.some(cc => cc.slug === s))?.name_et || s).join(", ");
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
            <FilterSidebar categories={categoryTreeForSidebar} currentParams={params as Record<string, string | string[] | undefined>} />
          </aside>
          <section>
            <div className="grid grid-cols-[1fr_auto] items-center gap-[18px] mb-[22px] max-[640px]:grid-cols-1">
              <p className="text-muted">{activeLabel} · {totalCount} {t.books.count}</p>
              <Suspense><SortSelect /></Suspense>
            </div>

            {products.length > 0 ? <ProductGrid products={products.map(mapProduct)} columns={4} /> : (
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
