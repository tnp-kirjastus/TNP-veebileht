import { LayoutSidebar } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ProductGrid } from "@/components/store/ProductGrid";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProducts, getSeriesBySlug } from "@/lib/db/catalog";
import { isOnSale } from "@/lib/product-utils";
import type { Product } from "@/lib/data-types";

// Kataloog loeb otse andmebaasist — admini muudatused peegelduvad kohe.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getSeriesBySlug((await params).slug);
  return { title: `${s?.name || ""} — Sarjad` };
}

function map(p: Product) {
  const o = isOnSale(p);
  return { slug: p.slug, title: p.title_et, author: p.people.author?.join(", ") || "", price: p.price, salePrice: p.sale_price, effectivePrice: o ? p.sale_price! : p.price, coverImage: p.cover_image, isUpcoming: p.is_upcoming, isOnSale: o, salePercent: o && p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0, isArchived: p.is_archived };
}

// Kogu sari on nähtav: müügil olevad ees, seejärel arhiivis (läbimüüdud)
// teosed — kirjastuse toimetajad kasutavad lehte andmete otsimiseks.
function byAvailabilityThenDate(a: Product, b: Product) {
  if (a.is_archived !== b.is_archived) return a.is_archived ? 1 : -1;
  return (b.release_date || "").localeCompare(a.release_date || "") || a.title_et.localeCompare(b.title_et, "et");
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();
  const products = (await getAllProducts())
    .filter(p => p.series_slug === slug)
    .sort(byAvailabilityThenDate);
  const archivedCount = products.filter((p) => p.is_archived).length;

  return (
    <LayoutSidebar sidebar={<div className="p-5 text-muted text-sm">Filtrid</div>}>
      <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Sarjad", href: "/sarjad" }, { label: series.name }]} />
      <section className="py-[48px] border-b border-line"><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none">{series.name}</h1><p className="max-w-[620px] mt-4 text-muted">{products.length} raamatut{archivedCount > 0 ? ` (sh ${archivedCount} läbimüüdud)` : ""}</p></section>
      <div className="mt-8 mb-[22px]"><p className="text-muted">{products.length} raamatut{archivedCount > 0 ? ` (sh ${archivedCount} läbimüüdud)` : ""}</p></div>
      <ProductGrid products={products.map(map)} columns={4} />
    </LayoutSidebar>
  );
}
