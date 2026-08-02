"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CartDrawer } from "./CartDrawer";
import { useCartDrawer } from "@/lib/cart-drawer-context";

export function CartDrawerWrapper() {
  const { isOpen, close } = useCartDrawer();
  const subscribe = useCallback(() => () => {}, []);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) return null;

  return <CartDrawer open={isOpen} onClose={close} />;
}
