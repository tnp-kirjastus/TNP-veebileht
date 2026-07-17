"use client";

import { useCart } from "@/lib/cart-context";

export function CheckoutTitle() {
  const { items, hydrated } = useCart();
  const hasOnlyPreorders = hydrated && items.length > 0 && items.every(item => item.isUpcoming && item.allowPreorder);
  const title = hasOnlyPreorders ? "Raamatu tellimine" : "Vormista tellimus";

  return (
    <>
      <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">{title}</h1>
      {hasOnlyPreorders ? (
        <p className="text-muted mt-4">Ettetellimisel makset ei toimu. Raamat saadetakse pärast ilmumist.</p>
      ) : (
        <p className="text-muted mt-4">Kontrollime hinna ja saadavuse uuesti enne makse algatamist.</p>
      )}
    </>
  );
}
