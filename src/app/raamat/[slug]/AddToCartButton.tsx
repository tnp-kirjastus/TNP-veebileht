"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useCartDrawer } from "@/lib/cart-drawer-context";
import { AvailabilityModal } from "./AvailabilityModal";

export function AddToCartButton({ product, disabled = false }: {
  product: {
    slug: string; title: string; author: string;
    price: number; salePrice?: number | null;
    coverImage?: string | null;
    isUpcoming?: boolean;
    allowPreorder?: boolean;
    stock?: number;
    isArchived?: boolean;
  };
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const { open: openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  const stock = product.stock ?? 0;

  function handleAdd() {
    if (disabled) return;
    addItem(product);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  const isArchived = product.isArchived;
  const isUpcomingNoPreorder = product.isUpcoming && !product.allowPreorder;
  const isUpcomingPreorder = product.isUpcoming && product.allowPreorder;
  const isOutOfStock = stock === 0 && !product.isUpcoming;

  const label = isArchived
    ? "Läbimüüdud"
    : isUpcomingNoPreorder
      ? "Ilmumas"
      : isUpcomingPreorder
        ? "Ettetelli"
        : isOutOfStock
          ? "Küsi saadavust"
          : added
            ? "Lisatud!"
            : "Lisa ostukorvi";

  const isButtonDisabled = isArchived || isUpcomingNoPreorder || disabled;
  const isAvailability = isOutOfStock && !isArchived;

  function handleClick() {
    if (isAvailability) {
      setShowAvailability(true);
      return;
    }
    handleAdd();
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={`inline-flex items-center gap-[10px] self-start min-h-[52px] px-8 border font-extrabold transition-colors duration-200
          ${isAvailability
            ? "border-accent bg-white text-accent hover:bg-accent hover:text-white"
            : isButtonDisabled
              ? "bg-soft text-muted border-line cursor-not-allowed"
              : "border-ink bg-white text-ink hover:bg-ink hover:text-white"
          }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {isAvailability ? (
            <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>
          ) : (
            <><path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/></>
          )}
        </svg>
        {label}
      </button>

      {showAvailability && (
        <AvailabilityModal
          productTitle={product.title}
          onClose={() => setShowAvailability(false)}
        />
      )}
    </>
  );
}
