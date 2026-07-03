"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export function CheckoutGuard({ children }: { children: React.ReactNode }) {
  const { items, hydrated } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/ostukorv");
    }
  }, [items, hydrated, router]);

  if (!hydrated) return null;

  if (items.length === 0) return null;

  return <>{children}</>;
}
