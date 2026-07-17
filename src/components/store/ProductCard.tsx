"use client";
/* Book-cover source aspect ratios vary; native img preserves imported dimensions. */
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useCartDrawer } from "@/lib/cart-drawer-context";
import { getCoverUrlClient } from "@/lib/media-url";

export interface ProductCardData {
  slug: string;
  title_et?: string;
  title?: string;
  author_names?: string;
  author?: string;
  price: number;
  sale_price?: number | null;
  effective_price?: number;
  effectivePrice?: number;
  salePrice?: number | null;
  cover_image?: string;
  coverImage?: string | null;
  is_upcoming?: boolean;
  isUpcoming?: boolean;
  is_on_sale?: boolean;
  isOnSale?: boolean;
  sale_percent?: number;
  salePercent?: number;
  is_archived?: boolean;
  isArchived?: boolean;
}

export function ProductCard({
  product,
  variant = "listing",
}: {
  product: ProductCardData;
  variant?: "home" | "listing";
}) {
  const { addItem } = useCart();
  const { open: openCart } = useCartDrawer();

  const title = product.title_et || product.title || "";
  const author = product.author_names || product.author || "";
  const price = product.price;
  const salePrice = product.sale_price ?? product.salePrice ?? null;
  const effectivePrice = product.effective_price ?? product.effectivePrice ?? price;
  const coverImage = product.cover_image || product.coverImage || "";
  const isUpcoming = product.is_upcoming || product.isUpcoming || false;
  const isOnSale = product.is_on_sale || product.isOnSale || false;
  const salePercent = product.sale_percent ?? product.salePercent ?? 0;
  const isArchived = product.is_archived ?? product.isArchived ?? false;
  const imgWidth = variant === "home" ? "w-[86%]" : "w-[75%]";
  const titleSize = variant === "home" ? "text-[20px]" : "text-[19px]";

  function handleAddToCart() {
    if (isArchived) return;
    addItem({
      slug: product.slug,
      title,
      author,
      price,
      salePrice,
      coverImage,
    });
    openCart();
  }

  return (
    <article className="relative flex flex-col h-full py-[40px] px-5 hover:bg-ink/[0.07] group min-w-0">
      {isOnSale && salePercent > 0 && (
<<<<<<< HEAD
        <span className="absolute top-[12px] left-[12px] bg-accent text-white font-heading text-base font-bold px-[10px] py-1 rounded-md z-[1]">-{salePercent}%</span>
=======
        <span className="absolute top-[12px] left-[12px] bg-accent text-white font-heading text-base font-bold px-[10px] py-1 rounded-md z-20">-{salePercent}%</span>
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      )}
      <div className={`${imgWidth} mx-auto`}>
        <Link
          href={`/raamat/${product.slug}`}
          className={`overflow-hidden block
          filter drop-shadow-[_-14px_20px_20px_rgba(36,26,16,0.25)]
          hover:drop-shadow-[_-18px_28px_32px_rgba(36,26,16,0.38)]
          hover:-translate-y-1 transition-all duration-[350ms] cursor-pointer group/card`}
        >
          {coverImage ? (
            <img src={getCoverUrlClient(coverImage) ?? ""} alt={title} className="block w-full h-auto" loading="lazy" />
          ) : (
            <div className="aspect-[3/4] bg-soft flex items-center justify-center text-muted text-sm p-3 text-center">{title}</div>
          )}
        </Link>
      </div>

      <div className="mt-auto pt-[34px]">
        <h3 className={`font-heading ${titleSize} leading-[1.18]`}>
          <Link href={`/raamat/${product.slug}`} className="hover:text-accent transition-colors">
            {title}
          </Link>
          {isUpcoming && <span className="inline-block ml-[6px] text-[11px] font-extrabold text-leaf uppercase align-middle">Ilmumas</span>}
        </h3>
        {author && <p className="mt-1 text-muted text-sm">{author}</p>}

        <div className="grid grid-cols-[1fr_auto] gap-[10px] items-center mt-2">
          <div className="flex items-baseline gap-2">
            {isArchived ? <span className="text-[15px] font-extrabold text-muted">Läbimüüdud</span> : isOnSale && salePrice ? (
              <>
                <span className="text-[15px] text-muted line-through font-semibold">{Number(price).toFixed(2)} €</span>
                <span className="text-[17px] font-extrabold text-ink">{Number(salePrice).toFixed(2)} €</span>
              </>
            ) : (
              <span className="text-[17px] font-extrabold">{Number(effectivePrice).toFixed(2)} €</span>
            )}
          </div>

          <div className="flex gap-[8px] opacity-0 group-hover:opacity-100 max-[900px]:opacity-100 transition-opacity duration-[220ms]">
            <button disabled={isArchived} className="min-w-[42px] h-[42px] px-3 bg-panel grid place-items-center hover:bg-ink hover:text-white transition-colors disabled:bg-soft disabled:text-muted disabled:cursor-not-allowed"
              onClick={handleAddToCart} aria-label={isArchived ? "Läbimüüdud" : "Lisa ostukorvi"}>
              {isArchived ? <span className="text-xs font-extrabold">Läbimüüdud</span> :
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6h15l-2 8H8L6 3H3" /><circle cx="9" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" />
              </svg>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
