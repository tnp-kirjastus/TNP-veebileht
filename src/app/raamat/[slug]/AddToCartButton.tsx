"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useCartDrawer } from "@/lib/cart-drawer-context";

export function AddToCartButton({ product, disabled = false }: {
  product: { slug: string; title: string; author: string; price: number; salePrice?: number | null; coverImage?: string | null };
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const { open: openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (disabled) return;
    addItem(product);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button onClick={handleAdd} disabled={disabled}
      className="inline-flex items-center gap-[10px] self-start min-h-[52px] px-8 border border-ink bg-ink text-white font-extrabold hover:bg-[#2a2d30] transition-colors duration-200 disabled:bg-soft disabled:text-muted disabled:border-line disabled:cursor-not-allowed">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>
      </svg>
      {disabled ? "Läbimüüdud" : added ? "Lisatud!" : "Lisa ostukorvi"}
    </button>
  );
}
