"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface CartItem {
  slug: string;
  title: string;
  author: string;
  price: number;
  salePrice: number | null;
  coverImage: string | null;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: {
    slug: string; title: string; author: string;
    price: number; salePrice?: number | null; coverImage?: string | null;
  }) => void;
  removeItem: (slug: string) => void;
  updateQuantity: (slug: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  error: string | null;
  hydrated: boolean;
}

const CartContext = createContext<CartContextType>({
  items: [], addItem: () => {}, removeItem: () => {}, updateQuantity: () => {},
  clearCart: () => {}, itemCount: 0, total: 0, error: null, hydrated: false,
});

const STORAGE_KEY = "tnp-cart";

function loadFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as CartItem[];
    return [];
  } catch { return []; }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* quota exceeded */ }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const inited = useRef(false);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length > 0) setItems(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (inited.current || !hydrated) return;
    inited.current = true;
    const controller = new AbortController();
    fetch("/api/cart", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("cart_read_failed")))
      .then((cart: { items: CartItem[] }) => {
        if (Array.isArray(cart.items) && cart.items.length > 0) {
          setItems(cart.items);
          saveToStorage(cart.items);
        }
        setError(null);
      })
      .catch((cause) => { if (cause?.name !== "AbortError") {/* API unavailable, local storage is fine */} });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = useCallback(async (slug: string, quantity: number) => {
    try {
      const response = await fetch("/api/cart", {
        method: quantity > 0 ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, quantity }),
      });
      if (!response.ok) throw new Error("cart_write_failed");
      const cart = await response.json() as { items: CartItem[] };
      setItems(cart.items);
      saveToStorage(cart.items);
      setError(null);
    } catch { /* API unavailable, rely on local storage */ }
  }, []);

  const addItem = useCallback((product: {
    slug: string; title: string; author: string;
    price: number; salePrice?: number | null; coverImage?: string | null;
  }) => {
    let newQuantity = 1;
    setItems(prev => {
      const existing = prev.find(i => i.slug === product.slug);
      let next: CartItem[];
      if (existing) {
        newQuantity = existing.quantity + 1;
        next = prev.map(i => i.slug === product.slug ? { ...i, quantity: newQuantity } : i);
      } else {
        next = [...prev, {
          slug: product.slug, title: product.title, author: product.author,
          price: product.price, salePrice: product.salePrice ?? null,
          coverImage: product.coverImage ?? null, quantity: 1,
        }];
      }
      saveToStorage(next);
      return next;
    });
    void sync(product.slug, newQuantity);
  }, [sync]);

  const removeItem = useCallback((slug: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.slug !== slug);
      saveToStorage(next);
      return next;
    });
    void sync(slug, 0);
  }, [sync]);

  const updateQuantity = useCallback((slug: string, qty: number) => {
    if (qty < 1) { removeItem(slug); return; }
    setItems(prev => {
      const next = prev.map(i => i.slug === slug ? { ...i, quantity: qty } : i);
      saveToStorage(next);
      return next;
    });
    void sync(slug, qty);
  }, [removeItem, sync]);

  const clearCart = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + (i.salePrice ?? i.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total, error, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
