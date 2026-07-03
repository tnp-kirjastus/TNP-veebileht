"use client";
/* Book-cover source aspect ratios vary; native img preserves imported dimensions. */
/* eslint-disable @next/next/no-img-element */

import { useCart } from "@/lib/cart-context";
import { useState } from "react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getCoverUrlClient } from "@/lib/media-url";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, total, error } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function closeDrawer() {
    setCheckoutOpen(false);
    onClose();
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[rgba(21,23,24,.42)] transition-opacity duration-[250ms] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeDrawer}
        aria-hidden={!open}
      />

      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 bottom-0 z-40 w-[min(520px,100vw)] bg-panel border-l border-ink grid grid-rows-[auto_1fr_auto] transition-transform duration-[320ms] ${open ? "translate-x-0" : "translate-x-[104%]"}`}
      >
        <div className="p-[22px] border-b border-line flex items-center justify-between gap-[18px]">
          <div className="flex items-center gap-3">
            {checkoutOpen && (
              <button type="button" onClick={() => setCheckoutOpen(false)} className="w-[44px] h-[44px] border border-line grid place-items-center hover:bg-soft" aria-label="Tagasi ostukorvi">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 18 6-6-6-6"/></svg>
              </button>
            )}
            <h2 className="text-[26px] font-heading">{checkoutOpen ? "Vormista tellimus" : "Ostukorv"}</h2>
          </div>
          <button className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center hover:bg-soft" onClick={closeDrawer} aria-label="Sulge ostukorv">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        <div className="overflow-auto p-[18px_22px]">
          {checkoutOpen ? (
            <CheckoutForm compact />
          ) : items.length === 0 ? (
            <div className="py-[56px] px-5 border border-dashed border-line text-center text-muted">
              Ostukorv on tühi. Lisa mõni raamat ja proovi tellimuse vormistamist.
            </div>
          ) : (
            items.map(item => (
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
                    <button onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                      className="border-0 bg-transparent text-ink font-extrabold hover:bg-soft">-</button>
                    <span className="grid place-items-center border-x border-line font-extrabold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                      className="border-0 bg-transparent text-ink font-extrabold hover:bg-soft">+</button>
                  </div>
                  <button onClick={() => removeItem(item.slug)}
                    className="border-0 bg-transparent text-ink font-extrabold mt-2 text-sm hover:text-accent">Eemalda</button>
                </div>
                <div className="font-extrabold whitespace-nowrap">{((item.salePrice ?? item.price) * item.quantity).toFixed(2)} €</div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && !checkoutOpen && (
          <div className="p-[22px] border-t border-line bg-[#faf7f0]">
            <div className="flex items-center justify-between gap-[18px] mb-4 text-xl font-extrabold">
              <span>Kokku</span>
              <span>{total.toFixed(2)} €</span>
            </div>

            {error && <p role="alert" className="text-accent font-bold mb-3">{error}</p>}
            <button type="button" onClick={() => setCheckoutOpen(true)}
                className="w-full min-h-[46px] px-[18px] border border-ink bg-ink text-white font-extrabold hover:bg-[#2a2d30] transition-colors inline-flex items-center justify-center gap-[9px]">
                Vormista tellimus
              </button>
          </div>
        )}
      </aside>
    </>
  );
}
