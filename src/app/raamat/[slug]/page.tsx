/* Book-cover source aspect ratios vary; native img preserves imported dimensions. */
/* eslint-disable @next/next/no-img-element */
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { AddToCartButton } from "./AddToCartButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getPersonByName, getProductBySlug, getRelatedProducts, getSameSeriesProducts, getSameAuthorProducts, isOnSale, formatEuro, formatDate, type Product } from "@/lib/data";
import { plainText, sanitizeRichText } from "@/lib/sanitize";
import { siteUrl } from "@/lib/env";
import { getCoverUrl } from "@/lib/media-url";

function coverAbsoluteUrl(coverImage: string | null): string | null {
  const url = getCoverUrl(coverImage);
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return new URL(url, siteUrl()).toString();
}

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Toode" };
  const description = plainText(product.description_et).slice(0, 160);
  return {
    title: product.title_et,
    description,
    alternates: { canonical: `/raamat/${product.slug}` },
    openGraph: {
      title: product.title_et,
      description,
      type: "book",
      images: product.cover_image ? [{ url: coverAbsoluteUrl(product.cover_image) ?? "", alt: product.title_et }] : [],
    },
  };
}

function personHref(role: string, name: string) {
  const value = getPersonByName(name)?.slug ?? name;
  return `/raamatud?${role}=${encodeURIComponent(value)}`;
}

function mapProduct(p: Product) {
  const onSale = isOnSale(p);
  return { slug: p.slug, title: p.title_et, author: p.people.author?.join(", ") || "", price: p.price, salePrice: p.sale_price, effectivePrice: onSale ? p.sale_price! : p.price, coverImage: p.cover_image, isUpcoming: p.is_upcoming, isOnSale: onSale, salePercent: onSale && p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0 };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const onSale = isOnSale(product);
  const salePercent = onSale && product.sale_price ? Math.round(((product.price - product.sale_price) / product.price) * 100) : 0;
  const authorNames = product.people.author?.join(", ") || "";

  const relatedCat = getRelatedProducts(product, 5).map(mapProduct);
  const sameAuthor = getSameAuthorProducts(product, 5).map(mapProduct);
  const sameSeries = getSameSeriesProducts(product, 5).map(mapProduct);
  const effectivePrice = onSale && product.sale_price ? product.sale_price : product.price;
  const primaryCategory = product.categories[0];
  const primaryCategorySlug = getCategories().find((category) => category.name === primaryCategory)?.slug;
  const primaryAuthor = product.people.author?.[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title_et,
    sku: product.sku,
    gtin13: product.sku,
    image: product.cover_image ? coverAbsoluteUrl(product.cover_image) ?? undefined : undefined,
    description: plainText(product.description_et),
    brand: { "@type": "Brand", name: "Tänapäev" },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: effectivePrice.toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: new URL(`/raamat/${product.slug}`, siteUrl()).toString(),
      seller: { "@type": "Organization", name: "Kirjastus Tänapäev", url: siteUrl().toString() },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "3.50",
          currency: "EUR",
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "EE" },
        deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" } },
      },
    },
    ...(product.series_name ? { isPartOf: { "@type": "Collection", name: product.series_name } } : {}),
    ...(product.pages ? { material: product.binding ?? undefined, depth: { "@type": "QuantitativeValue", value: product.pages, unitText: "lehekülge" } } : {}),
    ...(product.people.author?.length ? { manufacturer: { "@type": "Organization", name: product.people.author.join(", ") } } : {}),
  };

  return (
    <LayoutContained>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Product hero — breadcrumbs INSIDE the same section */}
      <section className="relative grid grid-cols-[1fr_1fr] gap-12 py-[10px] pb-[50px] items-stretch max-[900px]:grid-cols-1">
        {onSale && salePercent > 0 && (
          <span className="absolute top-[12px] left-[12px] bg-accent text-white font-heading text-base font-bold px-[10px] py-1 rounded-md z-10">-{salePercent}%</span>
        )}
        <div className="grid place-items-center bg-soft px-10 py-[60px] max-[900px]:py-8 max-[600px]:px-6 max-[600px]:py-[30px]">
          {product.cover_image ? <img src={getCoverUrl(product.cover_image) ?? ""} alt={product.title_et} className="max-h-[800px] w-auto max-w-[90%] filter drop-shadow-[_-18px_24px_28px_rgba(36,26,16,0.28)] max-[900px]:max-h-[600px] max-[600px]:max-h-[450px]" loading="eager" /> : <div className="aspect-[3/4] w-[75%] bg-muted/10 flex items-center justify-center text-muted text-center p-4">{product.title_et}</div>}
        </div>
        <div className="flex flex-col justify-center gap-4">
          <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Raamatud", href: "/raamatud" }, { label: product.title_et }]} />
          <h1 className="font-heading text-[clamp(34px,5vw,56px)] leading-[1.05] mb-[2px]">{product.title_et}</h1>
          {authorNames && <p className="text-lg text-muted">{product.people.author?.map((a: string, i: number) => (<span key={a}>{i > 0 && ", "}<Link href={personHref("author", a)} className="hover:text-ink hover:underline transition-colors">{a}</Link></span>))}</p>}
          <div className="text-[28px] font-extrabold">{onSale && product.sale_price ? <span className="flex items-baseline gap-3"><span className="text-muted line-through text-lg font-semibold">{formatEuro(product.price)}</span><span className="text-accent">{formatEuro(product.sale_price)}</span></span> : formatEuro(product.price)}</div>
          <AddToCartButton disabled={product.is_archived || product.stock < 1} product={{ slug: product.slug, title: product.title_et, author: authorNames, price: product.price, salePrice: product.sale_price, coverImage: product.cover_image }} />
          {product.description_et && <div className="prose prose-sm max-w-[520px] text-ink/80 prose-a:text-accent" dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.description_et) }} />}
          <div className="mt-2">
            <h2 className="font-heading text-lg mb-3">Toote andmed</h2>
            <dl className="grid grid-cols-[1fr_1fr] gap-[4px_24px] max-[600px]:grid-cols-1">
              {product.sku && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">ISBN</dt><dd className="text-[13px] text-[#363b3f]">{product.sku}</dd></div>}
              {product.binding && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Köide</dt><dd className="text-[13px] text-[#363b3f]">{product.binding}</dd></div>}
              {product.release_date && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Ilmumine</dt><dd className="text-[13px] text-[#363b3f]">{formatDate(product.release_date)}</dd></div>}
              {product.pages && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Lehekülgi</dt><dd className="text-[13px] text-[#363b3f]">{product.pages}</dd></div>}
              {product.people.translator?.length > 0 && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Tõlkija</dt><dd className="text-[13px] text-[#363b3f]">{product.people.translator.map((t: string, i: number) => (<span key={t}>{i > 0 && ", "}<Link href={personHref("translator", t)} className="text-accent hover:underline font-semibold">{t}</Link></span>))}</dd></div>}
              {product.people.designer?.length > 0 && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Kujundaja</dt><dd className="text-[13px] text-[#363b3f]">{product.people.designer.map((d: string, i: number) => (<span key={d}>{i > 0 && ", "}<Link href={personHref("designer", d)} className="text-accent hover:underline font-semibold">{d}</Link></span>))}</dd></div>}
              {product.people.editor?.length > 0 && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Toimetaja</dt><dd className="text-[13px] text-[#363b3f]">{product.people.editor.map((e: string, i: number) => (<span key={e}>{i > 0 && ", "}<Link href={personHref("editor", e)} className="text-accent hover:underline font-semibold">{e}</Link></span>))}</dd></div>}
              {product.people.illustrator?.length > 0 && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Illustreerija</dt><dd className="text-[13px] text-[#363b3f]">{product.people.illustrator.map((il: string, i: number) => (<span key={il}>{i > 0 && ", "}<Link href={personHref("illustrator", il)} className="text-accent hover:underline font-semibold">{il}</Link></span>))}</dd></div>}
              {product.series_name && <div><dt className="text-[11px] font-extrabold uppercase text-muted tracking-[0.04em] mt-[10px]">Sari</dt><dd className="text-[13px] text-[#363b3f]"><Link href={`/sarjad/${product.series_slug}`} className="text-accent hover:underline font-semibold">{product.series_name}</Link></dd></div>}
            </dl>
          </div>
        </div>
      </section>

      {/* Related sections */}
      {relatedCat.length > 0 && (
        <section className="py-[50px] pb-[10px]">
          <div className="flex items-end justify-between gap-5 mb-[22px]">
            <h2 className="font-heading text-[28px]">{product.categories[0] ? `${product.categories[0]} kategooriast` : "Sellest kategooriast"}</h2>
            {primaryCategorySlug && <Link href={`/raamatud?category=${encodeURIComponent(primaryCategorySlug)}`} className="text-accent font-extrabold text-sm hover:text-accent-dark">Kõik selle kategooria raamatud →</Link>}
          </div>
          <ProductGrid products={relatedCat} columns={5} />
        </section>
      )}

      {sameAuthor.length > 0 && primaryAuthor && (
        <section className="py-[50px] pb-[10px]">
          <div className="flex items-end justify-between gap-5 mb-[22px]">
            <h2 className="font-heading text-[28px]">Veel autorilt {primaryAuthor}</h2>
            <Link href={personHref("author", primaryAuthor)} className="text-accent font-extrabold text-sm hover:text-accent-dark transition-colors">Kõik autori raamatud →</Link>
          </div>
          <ProductGrid products={sameAuthor} columns={5} />
        </section>
      )}

      {sameSeries.length > 0 && product.series_slug && (
        <section className="py-[50px] pb-[10px]">
          <div className="flex items-end justify-between gap-5 mb-[22px]">
            <h2 className="font-heading text-[28px]">Veel sarjast {product.series_name}</h2>
            <Link href={`/sarjad/${product.series_slug}`} className="text-accent font-extrabold text-sm hover:text-accent-dark transition-colors">Kõik sarja raamatud →</Link>
          </div>
          <ProductGrid products={sameSeries} columns={5} />
        </section>
      )}

      <NewsletterSection />
    </LayoutContained>
  );
}
