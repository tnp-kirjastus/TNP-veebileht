"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export function CheckoutGuard({ children }: { children: React.ReactNode }) {
  const { items } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/ostukorv");
    }
  }, [items, router]);

  if (items.length === 0) return null;

  return <>{children}</>;
}
