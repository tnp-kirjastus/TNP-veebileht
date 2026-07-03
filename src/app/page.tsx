/* Showcase artwork uses heterogeneous source ratios from the approved mockup. */
/* eslint-disable @next/next/no-img-element */
import { LayoutFull, Shell } from "@/components/layout";
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { t } from "@/lib/translations";
import { getNewProducts, getSaleProducts, getUpcomingProducts, getActiveProducts, isOnSale, type Product } from "@/lib/data";

export const revalidate = 3600;

function mapProduct(p: Product) {
  const onSale = isOnSale(p);
  return { slug: p.slug, title: p.title_et, author: p.people.author?.join(", ") || "", price: p.price, salePrice: p.sale_price, effectivePrice: onSale ? p.sale_price! : p.price, coverImage: p.cover_image, isUpcoming: p.is_upcoming, isOnSale: onSale, salePercent: onSale && p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0 };
}

export default function HomePage() {
  const newBooks = getNewProducts(10).map(mapProduct);
  const campaignBooks = getSaleProducts().slice(0, 5).map(mapProduct);
  const upcomingBooks = getUpcomingProducts().slice(0, 5).map(mapProduct);
  const discountBooks = getActiveProducts().filter(p => isOnSale(p)).slice(5, 10).map(mapProduct);

  return (
    <LayoutFull>
      {/* HERO */}
      <section className="py-[28px]">
        <Shell>
          <div className="grid grid-cols-[.92fr_1.08fr] gap-[34px] items-stretch max-[1120px]:grid-cols-1">
            <div className="min-h-[520px] flex flex-col justify-center py-[28px] px-[28px] max-[1120px]:min-h-0">
              <div>
                <h1 className="font-heading text-[clamp(56px,6vw,71px)] leading-[0.94] max-w-[680px]">{t.home.hero_title}</h1>
                <p className="mt-[14px] max-w-[640px] text-muted text-[17px] leading-[1.4]">Suur valik ilukirjandust, lasteraamatuid, ajaloo- ja praktilisi teoseid.</p>
                <form action="/raamatud" method="GET" className="mt-[56px] grid grid-cols-[1fr_auto] max-w-[640px] border border-line bg-panel filter drop-shadow-[4px_8px_16px_rgba(36,26,16,0.12)] overflow-hidden max-[760px]:grid-cols-1">
                  <input name="q" type="search" placeholder="Otsi pealkirja, autorit või kategooriat" autoComplete="off" className="min-w-0 h-[58px] bg-transparent px-6 outline-none max-[760px]:h-[54px]" />
                  <button type="submit" aria-label="Otsi" className="w-[58px] h-[58px] bg-transparent text-ink grid place-items-center hover:text-accent transition-colors max-[760px]:w-full max-[760px]:h-[48px]">
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </form>
              </div>
            </div>

            <div className="min-h-[520px] grid grid-cols-[1fr_1fr] grid-rows-[1.18fr_.82fr] gap-[18px] max-[760px]:grid-cols-1 max-[760px]:grid-rows-[repeat(3,270px)]" aria-label="Esiletõstetud raamatud">
              <a href="/raamatud?category=ajalugu" className="row-[span_2] flex flex-col items-start justify-start gap-6 overflow-hidden border border-line bg-[#dfebdf] p-[28px] group max-[760px]:row-auto">
                <div className="max-w-full"><span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">Ajalugu</span><h2 className="font-heading text-[30px] leading-[1.08] mt-2">Eesti lood ja kadunud vaated</h2><p className="text-[#465057] text-sm font-semibold mt-[10px]">Ajalooraamatud, mälestused ja kohalikud lood.</p></div>
                <img src="/books/eesti-moisad-836x1024.jpg" alt="Eesti mõisad" className="w-[min(80%,360px)] max-h-[62%] self-center mt-auto transform rotate-[3deg] translate-y-2 transition-all duration-[450ms] group-hover:rotate-0 group-hover:scale-[1.04] group-hover:translate-y-0" />
              </a>
              <a href="/raamatud?category=laste-ja-noorteraamatud" className="flex items-center justify-between gap-4 overflow-hidden border border-line bg-[#dbe9ee] p-[28px] group">
                <div className="flex-shrink-0 max-w-[55%]"><span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">Lastele</span><h2 className="font-heading text-[30px] leading-[1.08] mt-2">Suvised seiklused</h2><p className="text-[#465057] text-sm font-semibold mt-[10px]">Rõõmsad lood väiksemale lugejale.</p></div>
                <img src="/books/naksitrallid2013-190x254.jpg" alt="Naksitrallid" className="w-[min(40%,200px)] max-h-[85%] object-contain flex-shrink-0 filter drop-shadow-[_-14px_18px_18px_rgba(28,22,16,0.22)] transform rotate-[3deg] transition-transform duration-[450ms] group-hover:rotate-0 group-hover:scale-[1.04]" />
              </a>
              <a href="/raamat/90-rododendronit" className="flex items-center justify-between gap-4 overflow-hidden border border-line bg-[#f2e1c7] p-[28px] group">
                <div className="flex-shrink-0 max-w-[55%]"><span className="text-accent font-extrabold text-[13px] uppercase tracking-[0.08em]">Kodu ja hobi</span><h2 className="font-heading text-[30px] leading-[1.08] mt-2">Praktilised lemmikud</h2><p className="text-[#465057] text-sm font-semibold mt-[10px]">Aed, käsitöö ja kodused oskused.</p></div>
                <img src="/books/90-rododendronit-e1466156951724-190x300.jpg" alt="90 rododendronit" className="w-[min(40%,200px)] max-h-[85%] object-contain flex-shrink-0 filter drop-shadow-[_-14px_18px_18px_rgba(28,22,16,0.22)] transform rotate-[3deg] transition-transform duration-[450ms] group-hover:rotate-0 group-hover:scale-[1.04]" />
              </a>
            </div>
          </div>
        </Shell>
      </section>

      {/* #uued - Uued raamatud (white bg) */}
      <section id="uued" className="py-[40px] bg-white">
        <Shell>
          <SectionHeading title="Uued raamatud" href="/raamatud?sort=newest" linkLabel="Kõik uued raamatud" />
          {newBooks.length > 0 ? <ProductGrid products={newBooks} columns={5} variant="home" /> : <ProductGrid products={[]} columns={5} loading />}
        </Shell>
      </section>

      {/* #kampaania - Kampaania raamatud */}
      {campaignBooks.length > 0 && (
        <section id="kampaania" className="py-[40px] bg-[#fffbf6]">
          <Shell>
            <SectionHeading title="Kampaania raamatud" href="/pakkumised" linkLabel="Kõik pakkumised" />
            <ProductGrid products={campaignBooks} columns={5} variant="home" />
          </Shell>
        </section>
      )}

      {/* #ilmuvad - Ilmuvad raamatud */}
      {upcomingBooks.length > 0 && (
        <section id="ilmuvad" className="py-[40px] bg-[#f7f7f7]">
          <Shell>
            <SectionHeading title="Ilmuvad raamatud" href="/raamatud?upcoming=true" linkLabel="Kõik ilmuvad" />
            <ProductGrid products={upcomingBooks} columns={5} variant="home" />
          </Shell>
        </section>
      )}

      {/* #soodsad - Püsivalt soodsad raamatud */}
      {discountBooks.length > 0 && (
        <section id="soodsad" className="py-[40px] bg-white">
          <Shell>
            <SectionHeading title="Püsivalt soodsad raamatud" href="/pakkumised" linkLabel="Kõik soodsad raamatud" />
            <ProductGrid products={discountBooks} columns={5} variant="home" />
          </Shell>
        </section>
      )}

      <NewsletterSection />
    </LayoutFull>
  );
}
