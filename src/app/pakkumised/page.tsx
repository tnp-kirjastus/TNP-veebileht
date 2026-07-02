import type { Metadata } from "next";
import { LayoutFull, Shell } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import Link from "next/link";
import { getSaleProducts, getSalePercent, isOnSale, type Product } from "@/lib/data";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Pakkumised ja kampaaniad", description: "Kõik aktiivsed püsivad ja hooajalised raamatupakkumised." };

function card(product: Product) { const sale = isOnSale(product); return { slug: product.slug, title: product.title_et, author: product.people.author?.join(", ") || "", price: product.price, salePrice: product.sale_price, effectivePrice: sale ? product.sale_price! : product.price, coverImage: product.cover_image, isUpcoming: product.is_upcoming, isOnSale: sale, salePercent: getSalePercent(product) }; }

export default function CampaignsPage() {
  const products = getSaleProducts().sort((a, b) => getSalePercent(b) - getSalePercent(a) || a.title_et.localeCompare(b.title_et, "et"));
  const grouped = Map.groupBy(products, (product) => `${product.sale_start ?? "always"}|${product.sale_end ?? "open"}`);
  return <LayoutFull><section className="py-[50px] border-b border-line"><Shell><Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Pakkumised" }]} /><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Pakkumised ja kampaaniad</h1><p className="max-w-[620px] mt-4 text-muted">Lehel kuvatakse kõik aktiivsed kampaaniad — nii püsivad pakkumised kui hooajalised. Iga kampaania kuvab kuni viis raamatut.</p></Shell></section>{[...grouped.entries()].map(([key, books], index) => { const [start, end] = key.split("|"); const persistent = start === "always" && end === "open"; const title = persistent ? "Püsivalt soodsad" : index === 0 ? "Praegune kampaania" : `Kampaania ${new Date(start).toLocaleDateString("et-EE")} – ${end === "open" ? "tähtajatu" : new Date(end).toLocaleDateString("et-EE")}`; return <section key={key} className={`my-[34px] py-[34px] ${index % 2 ? "bg-[#f7f7f7]" : "bg-[#fffbf6]"}`}><Shell><div className="flex justify-between items-end gap-4 mb-6 max-sm:items-start max-sm:flex-col"><div><p className="text-sm text-muted font-bold">{persistent ? "Püsiv pakkumine" : "Hooajaline kampaania"}</p><h2 className="font-heading text-[32px] max-sm:text-[26px]">{title}</h2></div><Link href="/raamatud?sale=true" className="font-extrabold text-accent">Vaata kõiki →</Link></div><ProductGrid products={books.slice(0, 5).map(card)} columns={5} /></Shell></section>; })}{products.length === 0 && <Shell><div className="my-12 border border-dashed border-line p-12 text-center text-muted">Aktiivseid pakkumisi hetkel ei ole.</div></Shell>}<NewsletterSection /></LayoutFull>;
}

