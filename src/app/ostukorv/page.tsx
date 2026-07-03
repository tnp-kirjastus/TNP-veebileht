"use client";
/* Book-cover source aspect ratios vary; native img preserves imported dimensions. */
/* eslint-disable @next/next/no-img-element */

import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { useCart } from "@/lib/cart-context";
import { getCoverUrlClient } from "@/lib/media-url";
import Link from "next/link";

const FREE_SHIPPING = 40;

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, error } = useCart();
  const needsMore = FREE_SHIPPING - total;

  return (
    <LayoutContained>
      <section className="py-[50px] border-b border-line">
        <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Ostukorv" }]} />
        <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Ostukorv</h1>
      </section>

      <div className="py-12">
        {items.length === 0 ? (
          <div className="border border-dashed border-line p-[60px] text-center text-muted">
            <p className="text-xl font-heading mb-3">Ostukorv on tühi</p>
            <p className="mb-6">Lisa mõni raamat ja proovi tellimuse vormistamist.</p>
            <Link href="/raamatud" className="inline-block text-accent font-bold hover:underline">Sirvi raamatuid →</Link>
          </div>
        ) : (
          <div className="grid gap-0">
            {items.map((item) => (
              <div key={item.slug} className="grid grid-cols-[76px_1fr_auto] gap-[14px] py-4 border-b border-line">
                {item.coverImage ? (
                  <img src={getCoverUrlClient(item.coverImage) ?? ""} alt={item.title}
                    className="w-[76px] h-[106px] object-contain bg-soft border border-line p-[7px]" />
                ) : (
                  <div className="w-[76px] h-[106px] bg-soft border border-line" />
                )}
                <div>
                  <h3 className="font-heading text-base leading-[1.2]">{item.title}</h3>
                  <p className="mt-[5px] text-muted text-[13px]">{item.author}</p>
                  <div className="inline-grid grid-cols-[32px_34px_32px] mt-3 border border-line">
                    <button onClick={() => updateQuantity(item.slug, item.quantity - 1)} className="bg-transparent text-ink font-extrabold hover:bg-soft">-</button>
                    <span className="grid place-items-center border-x border-line font-extrabold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.slug, item.quantity + 1)} className="bg-transparent text-ink font-extrabold hover:bg-soft">+</button>
                  </div>
                  <button onClick={() => removeItem(item.slug)} className="border-0 bg-transparent text-ink font-extrabold mt-2 text-sm hover:text-accent">Eemalda</button>
                </div>
                <div className="font-extrabold whitespace-nowrap">
                  {((item.salePrice ?? item.price) * item.quantity).toFixed(2)} €
                </div>
              </div>
            ))}

            {needsMore > 0 && (
              <div className="mt-4 border border-dashed border-ink/20 p-4 text-center bg-soft">
                <span className="text-muted">Lisa ostukorvi veel </span>
                <strong className="text-ink">{needsMore.toFixed(2)} €</strong>
                <span className="text-muted"> eest tooteid ja tarne on </span>
                <strong className="text-leaf">TASUTA</strong>
              </div>
            )}

            <div className="mt-6 p-[22px] bg-[#faf7f0] border border-line">
              <div className="flex items-center justify-between gap-[18px] mb-4 text-xl font-extrabold">
                <span>Kokku</span>
                <span>{total.toFixed(2)} €</span>
              </div>
              {error && <p role="alert" className="text-accent font-bold mb-3">{error}</p>}
              <Link href="/ostukorv/kassa" className="w-full min-h-[46px] px-[18px] border border-ink bg-ink text-white font-extrabold hover:bg-[#2a2d30] transition-colors flex items-center justify-center">
                Vormista tellimus
              </Link>
            </div>
          </div>
        )}
      </div>
    </LayoutContained>
  );
}
