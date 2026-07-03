"use client";

import { useState, useEffect } from "react";
import { CartDrawer } from "./CartDrawer";
import { useCartDrawer } from "@/lib/cart-drawer-context";

export function CartDrawerWrapper() {
  const { isOpen, close } = useCartDrawer();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return <CartDrawer open={isOpen} onClose={close} />;
}
