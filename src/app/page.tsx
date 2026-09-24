/* Showcase artwork uses heterogeneous source ratios from the approved mockup. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LayoutFull, Shell } from "@/components/layout";
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { t } from "@/lib/translations";
import { getHomepageHero, getHomepageCards, getHomepageSections, type HomepageSection, type HomepageCard } from "@/lib/homepage";
import { SECTION_SOURCE_LINK_LABELS } from "@/lib/homepage-sections";
import { getNewProducts, getSaleProducts, getOpenSaleProducts, getUpcomingProducts } from "@/lib/db/catalog";
import { isOnSale } from "@/lib/product-utils";
import type { Product } from "@/lib/data-types";

// Kõik andmed tulevad otse andmebaasist — admini muudatused peegelduvad kohe.
export const dynamic = "force-dynamic";

function mapProduct(p: Product) {
  const onSale = isOnSale(p);
  return { slug: p.slug, title: p.title_et, author: p.people.author?.join(", ") || "", price: p.price, salePrice: p.sale_price, effectivePrice: onSale ? p.sale_price! : p.price, coverImage: p.cover_image, isUpcoming: p.is_upcoming, isOnSale: onSale, salePercent: onSale && p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0 };
}

const FALLBACK_CARDS: HomepageCard[] = [
  {
    id: "fallback-1",
    label: "Ajalugu",
    heading: "Eesti lood ja kadunud vaated",
    description: "Ajalooraamatud, mälestused ja kohalikud lood.",
    linkHref: "/raamatud?category=ajalugu-ja-poliitika",
    desktopImage: "/books/eesti-moisad-836x1024.jpg",
    mobileImage: "/books/eesti-moisad-836x1024.jpg",
    position: 0,
  },
  {
    id: "fallback-2",
    label: "Lastele",
    heading: "Suvised seiklused",
    description: "Rõõmsad lood väiksemale lugejale.",
    linkHref: "/raamatud?category=lasteraamatud",
    desktopImage: "/books/naksitrallid2013-190x254.jpg",
    mobileImage: "/books/naksitrallid2013-190x254.jpg",
    position: 1,
  },
  {
    id: "fallback-3",
    label: "Kodu ja hobi",
    heading: "Praktilised lemmikud",
    description: "Aed, käsitöö ja kodused oskused.",
    linkHref: "/raamatud?category=hobid",
    desktopImage: "/books/90-rododendronit-e1466156951724-190x300.jpg",
    mobileImage: "/books/90-rododendronit-e1466156951724-190x300.jpg",
    position: 2,
  },
];

const CARD_BG_COLORS = ["bg-[#dfebdf]", "bg-[#dbe9ee]", "bg-[#f2e1c7]"];

function FeaturedCard({ card, index }: { card: HomepageCard; index: number }) {
  const bg = CARD_BG_COLORS[index % CARD_BG_COLORS.length];
  const isFirst = index === 0;
  return (
    <Link href={card.linkHref}
      className={`${bg} overflow-hidden border border-line p-[28px] group ${isFirst ? "row-[span_2] flex flex-col items-start justify-start gap-6 max-[760px]:row-auto" : "flex items-center justify-between gap-4"}`}>
      {isFirst ? (
        <>
          <div className="max-w-full">
            <span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">{card.label}</span>
            <h2 className="font-heading text-[30px] leading-[1.08] mt-2">{card.heading}</h2>
            <p className="text-[#465057] text-sm font-semibold mt-[10px]">{card.description}</p>
          </div>
          {card.desktopImage && (
            <img src={card.desktopImage} alt="" className="w-[min(80%,360px)] max-h-[62%] self-center mt-auto transition-transform duration-[450ms] group-hover:scale-[1.04]" />
          )}
        </>
      ) : (
        <>
          <div className="flex-shrink-0 max-w-[55%]">
            <span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">{card.label}</span>
            <h2 className="font-heading text-[30px] leading-[1.08] mt-2">{card.heading}</h2>
            <p className="text-[#465057] text-sm font-semibold mt-[10px]">{card.description}</p>
          </div>
          {card.desktopImage && (
            <img src={card.desktopImage} alt="" className="w-[min(40%,200px)] max-h-[85%] object-contain flex-shrink-0 filter drop-shadow-[_-14px_18px_18px_rgba(28,22,16,0.22)] transition-transform duration-[450ms] group-hover:scale-[1.04]" />
          )}
        </>
      )}
    </Link>
  );
}

// Sektsiooni tausta värvide rotatsioon (soe toon iga teise ploki jaoks).
const SECTION_BG = ["bg-white", "bg-[#fffbf6]", "bg-[#f7f7f7]"];

export default async function HomePage() {
  // Esilehe sektsioonid tulevad 1:1 halduri seadetest (või vaikesektsioonidest,
  // mis on halduriga identsed) — pealkiri, toodete arv, link ja järjekord.
  const sections = (await getHomepageSections()).filter((s) => s.isVisible);

  // Iga allika koordinaator päritakse korra, ka siis kui seda kasutavad
  // mitu sektsiooni.
  const sources = new Set(sections.map((s) => s.source));
  const [newProducts, saleProducts, openSaleProducts, upcomingProducts] = await Promise.all([
    sources.has("newest") ? getNewProducts(12) : Promise.resolve([]),
    sources.has("sale") ? getSaleProducts() : Promise.resolve([]),
    sources.has("sale_open") ? getOpenSaleProducts(12) : Promise.resolve([]),
    sources.has("upcoming") ? getUpcomingProducts() : Promise.resolve([]),
  ]);

  function productsFor(section: HomepageSection) {
    const count = Math.max(1, Math.min(12, section.productCount || 5));
    switch (section.source) {
      case "newest": return newProducts.slice(0, count).map(mapProduct);
      case "sale": return saleProducts.slice(0, count).map(mapProduct);
      case "sale_open": return openSaleProducts.slice(0, count).map(mapProduct);
      case "upcoming": return upcomingProducts.slice(0, count).map(mapProduct);
      default: return []; // "category"/"manual" pole esilehel toetatud
    }
  }
  const heroConfig = await getHomepageHero();
  const heroHeading = heroConfig?.heading || t.home.hero_title;
  const heroHeadingSize = heroConfig?.headingSize || null;
  const heroSubtext = heroConfig?.subtext || "";
  const showSearch = heroConfig?.showSearch === true;
  const heroEyebrow = heroConfig?.eyebrow || null;
  const heroDesktopImage = heroConfig?.desktopImage || null;
  const heroMobileImage = heroConfig?.mobileImage || null;
  const hasCta = heroConfig?.ctaLabel && heroConfig?.ctaHref;
  const hasSecondary = heroConfig?.secondaryLabel && heroConfig?.secondaryHref;

  const cmsCards = await getHomepageCards();
  const featuredCards: HomepageCard[] = cmsCards.length >= 3 ? cmsCards.slice(0, 3) : FALLBACK_CARDS;

  return (
    <LayoutFull>
      {/* HERO */}
      <section className="py-[28px]">
        <Shell>
          <div className="grid grid-cols-[.92fr_1.08fr] gap-[34px] items-stretch max-[1120px]:grid-cols-1">
            <div className="min-h-[520px] flex flex-col justify-center py-[28px] px-[28px] max-[1120px]:min-h-0">
              {(heroDesktopImage || heroMobileImage) && (
                <>
                  <img
                    src={heroDesktopImage ?? heroMobileImage ?? ""}
                    alt=""
                    className={`w-full max-h-[320px] object-contain mb-6 ${heroMobileImage ? "max-[760px]:hidden" : ""}`}
                  />
                  {heroMobileImage && (
                    <img
                      src={heroMobileImage}
                      alt=""
                      className="hidden w-full max-h-[320px] object-contain mb-6 max-[760px]:block"
                    />
                  )}
                </>
              )}
              <div>
                {heroEyebrow && <span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">{heroEyebrow}</span>}
                <h1
                  className="font-heading leading-[0.94] max-w-[680px]"
                  style={{
                    fontSize: heroHeadingSize || "clamp(56px,6vw,71px)",
                  }}
                >{heroHeading}</h1>
                {heroSubtext && <p className="mt-[14px] max-w-[640px] text-muted text-[17px] leading-[1.4]">{heroSubtext}</p>}
                {(hasCta || hasSecondary) && (
                  <div className="mt-[28px] flex items-center gap-4 flex-wrap">
                    {hasCta && <Link href={heroConfig!.ctaHref!} className="min-h-[48px] inline-flex items-center px-6 border border-ink bg-white text-ink font-bold text-sm hover:bg-ink hover:text-white transition-colors">{heroConfig!.ctaLabel}</Link>}
                    {hasSecondary && <Link href={heroConfig!.secondaryHref!} className="min-h-[48px] inline-flex items-center px-6 border border-ink text-ink font-bold text-sm hover:bg-ink hover:text-white transition-colors">{heroConfig!.secondaryLabel}</Link>}
                  </div>
                )}
                {showSearch && (
                <form action="/raamatud" method="GET" className="mt-[56px] grid grid-cols-[1fr_auto] max-w-[640px] border border-line bg-panel filter drop-shadow-[4px_8px_16px_rgba(36,26,16,0.12)] overflow-hidden max-[760px]:grid-cols-1">
                  <input name="q" type="search" placeholder="Otsi pealkirja, autorit või kategooriat" autoComplete="off" className="min-w-0 h-[58px] bg-transparent px-6 outline-none max-[760px]:h-[54px]" />
                  <button type="submit" aria-label="Otsi" className="w-[58px] h-[58px] bg-transparent text-ink grid place-items-center hover:text-accent transition-colors max-[760px]:w-full max-[760px]:h-[48px]">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </form>
                )}
              </div>
            </div>

            <div className="min-h-[520px] grid grid-cols-[1fr_1fr] grid-rows-[1.18fr_.82fr] gap-[18px] max-[760px]:grid-cols-1 max-[760px]:grid-rows-[repeat(3,270px)]" aria-label="Esiletõstetud raamatud">
              {featuredCards.map((card, i) => <FeaturedCard key={card.id || i} card={card} index={i} />)}
            </div>
          </div>
        </Shell>
      </section>

      {/* Sektsioonid — täpselt nii nagu halduris seadistatud */}
      {sections.map((section, index) => {
        const products = productsFor(section);
        if (products.length === 0) return null; // tühja allikaga sektsiooni ei kuvata
        return (
          <section key={section.id} className={`py-[40px] ${SECTION_BG[index % SECTION_BG.length]}`}>
            <Shell>
              <SectionHeading
                title={section.heading}
                href={section.viewAllHref || undefined}
                linkLabel={SECTION_SOURCE_LINK_LABELS[section.source] ?? "Vaata kõiki"}
              />
              <ProductGrid products={products} columns={5} variant="home" />
            </Shell>
          </section>
        );
      })}

      <NewsletterSection />
    </LayoutFull>
  );
}
