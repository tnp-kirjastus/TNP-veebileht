"use client";

import { CartDrawer } from "./CartDrawer";
import { useCartDrawer } from "@/lib/cart-drawer-context";

export function CartDrawerWrapper() {
  const { isOpen, close } = useCartDrawer();
  return <CartDrawer open={isOpen} onClose={close} />;
}
