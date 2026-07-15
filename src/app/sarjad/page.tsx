import type { Metadata } from "next";
import Link from "next/link";
import { LayoutFull, Shell } from "@/components/layout";
// Breadcrumbs removed per client request (task 17)
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { getActiveProducts, getSalePercent, getSeries, isOnSale, type Product } from "@/lib/data";

export const metadata: Metadata = { title: "Sarjad" };
function card(product: Product) { const sale = isOnSale(product); return { slug: product.slug, title: product.title_et, author: product.people.author?.join(", ") || "", price: product.price, salePrice: product.sale_price, effectivePrice: sale ? product.sale_price! : product.price, coverImage: product.cover_image, isUpcoming: product.is_upcoming, isOnSale: sale, salePercent: getSalePercent(product) }; }

export default function SeriesPage() {
  const series = getSeries().map((item) => ({ ...item, products: getActiveProducts().filter((product) => product.series_slug === item.slug).sort((a, b) => (b.release_date || "").localeCompare(a.release_date || "")) })).filter((item) => item.products.length).sort((a, b) => (b.products[0]?.release_date || "").localeCompare(a.products[0]?.release_date || ""));
  return <LayoutFull><section className="py-[28px]"><Shell><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none">Sarjad</h1></Shell></section>{series.length === 0 ? <Shell><div className="my-12 border border-dashed border-line p-12 text-center text-muted">Ühtegi sarja ei leitud.</div></Shell> : series.map((item, index) => <section key={item.slug} className={`py-[42px] border-b border-line ${index % 2 ? "bg-white" : ""}`}><Shell><div className="flex justify-between items-end gap-5 mb-[22px]"><div><h2 className="font-heading text-[30px]">{item.name}</h2><p className="text-muted">{item.products.length} raamatut</p></div><Link href={`/sarjad/${item.slug}`} className="text-accent font-extrabold">Vaata kõiki</Link></div><ProductGrid products={item.products.slice(0, 5).map(card)} columns={5} /></Shell></section>)}<NewsletterSection /></LayoutFull>;
}

