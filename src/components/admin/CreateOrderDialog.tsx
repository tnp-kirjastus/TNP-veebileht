"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/components/admin/Toast";
import { createOrder } from "@/app/haldus/order-actions";
import { searchProducts } from "@/app/haldus/bulk-actions";
import { formatEuro } from "@/lib/product-utils";
import { roundEuro } from "@/lib/money";

interface ProductResult {
  id: string;
  sku: string;
  title_et: string;
  price: number;
  stock: number;
  is_archived: boolean;
  is_upcoming: boolean;
}

interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
}

type OrderStatus = "pending" | "payment_pending" | "paid" | "processing" | "shipped" | "cancelled" | "payment_failed" | "expired" | "manual_review" | "refunded" | "preorder";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Ootel" },
  { value: "payment_pending", label: "Makse ootel" },
  { value: "paid", label: "Makstud" },
  { value: "processing", label: "Töötlemisel" },
  { value: "shipped", label: "Saadetud" },
  { value: "cancelled", label: "Tühistatud" },
  { value: "payment_failed", label: "Makse ebaõnnestus" },
  { value: "expired", label: "Aegunud" },
  { value: "manual_review", label: "Käsitsi ülevaatus" },
  { value: "refunded", label: "Tagastatud" },
  { value: "preorder", label: "Ettetellimus" },
];

export function CreateOrderDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingMethod, setShippingMethod] = useState("omniva");
  const [shippingCost, setShippingCost] = useState(0);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [vatPercent, setVatPercent] = useState(9);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSearch = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProducts(q, 15);
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  function addItem(product: ProductResult) {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          title: product.title_et,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
    setSearchQuery("");
    setShowResults(false);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item)));
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vatAmount = roundEuro(subtotal * (vatPercent / 100));
  const total = roundEuro(subtotal + shippingCost);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress) {
      toast("Palun täida kõik kliendi väljad.", "error");
      return;
    }
    if (!customerName.includes(" ")) {
      toast("Sisesta ees- ja perekonnanimi.", "error");
      return;
    }
    if (items.length === 0) {
      toast("Lisa vähemalt üks toode.", "error");
      return;
    }

    const formData = new FormData();
    formData.set(
      "order",
      JSON.stringify({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        subtotal,
        total,
        status,
        vat_amount: vatAmount,
        vat_percent: vatPercent,
        items,
      })
    );

    startTransition(async () => {
      const result = await createOrder(undefined, formData);
      if (result?.error) {
        toast(result.error, "error");
      } else if (result?.success) {
        toast("Tellimus loodud.", "success");
        resetForm();
      }
    });
  }

  function resetForm() {
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setShippingAddress("");
    setShippingMethod("omniva");
    setShippingCost(0);
    setStatus("pending");
    setVatPercent(9);
    setItems([]);
    setSearchQuery("");
    setSearchResults([]);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 min-h-12 px-6 border border-accent bg-white text-accent font-bold hover:bg-accent hover:text-white transition-colors"
      >
        + Uus tellimus
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-panel border border-line shadow-lg max-w-3xl w-full"
          >
            <div className="p-8 border-b border-line">
              <h2 className="font-heading text-xl">Uus tellimus</h2>
              <p className="text-sm text-muted mt-1">Loo tellimus käsitsi — ilma maksmise etapita.</p>
            </div>

            <div className="p-8 grid gap-8">
              {/* Product search */}
              <div>
                <label className="block font-bold text-sm mb-2">Tooted</label>
                <div ref={searchRef} className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      doSearch(e.target.value);
                    }}
                    onFocus={() => { if (searchResults.length > 0) setShowResults(true); }}
                    placeholder="Otsi toodet pealkirja või SKU järgi…"
                    className="w-full border border-line px-4 py-2.5 text-sm bg-paper outline-none"
                  />
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full bg-panel border border-line max-h-60 overflow-y-auto shadow-lg z-10">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem(p)}
                          className="w-full text-left px-4 py-2.5 text-sm border-b border-line/50 hover:bg-soft transition-colors flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold">{p.title_et}</span>
                            <span className="text-muted ml-2 text-xs">{p.sku}</span>
                          </div>
                          <span className="font-bold text-sm">{formatEuro(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searching && (
                    <div className="absolute left-0 right-0 top-full bg-panel border border-line px-4 py-2.5 text-sm text-muted shadow-lg z-10">
                      Otsin…
                    </div>
                  )}
                  {showResults && !searching && searchQuery && searchResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full bg-panel border border-line px-4 py-2.5 text-sm text-muted shadow-lg z-10">
                      Tooteid ei leitud.
                    </div>
                  )}
                </div>

                {/* Selected items */}
                {items.length > 0 && (
                  <div className="mt-4 border border-line">
                    <table className="w-full text-sm">
                      <thead className="bg-soft">
                        <tr>
                          <th className="p-3 text-left font-extrabold text-xs uppercase text-muted">Toode</th>
                          <th className="p-3 text-left font-extrabold text-xs uppercase text-muted">Hind</th>
                          <th className="p-3 text-left font-extrabold text-xs uppercase text-muted">Kogus</th>
                          <th className="p-3 text-left font-extrabold text-xs uppercase text-muted">Kokku</th>
                          <th className="w-10 p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} className="border-t border-line">
                            <td className="p-3 font-bold">{item.title}</td>
                            <td className="p-3">{formatEuro(item.price)}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={item.quantity}
                                onChange={(e) => updateQuantity(i, parseInt(e.target.value, 10) || 1)}
                                className="w-16 border border-line px-2 py-1 text-center text-sm bg-paper"
                              />
                            </td>
                            <td className="p-3 font-bold">{formatEuro(item.price * item.quantity)}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="text-muted hover:text-accent"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Customer info */}
              <fieldset className="grid grid-cols-2 gap-4 border border-line p-4">
                <legend className="font-heading text-lg px-2">Klient</legend>
                <div>
                  <label className="block font-bold text-xs mb-1">Nimi *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                    placeholder="Ees- ja perekonnanimi"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">E-post *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">Telefon *</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">Aadress *</label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    required
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </div>
              </fieldset>

              {/* Shipping + status + VAT + totals */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-xs mb-1">Tarneviis</label>
                  <select
                    value={shippingMethod}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  >
                    <option value="omniva">Omniva</option>
                    <option value="smartpost">Smartpost</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">Tarnekulu (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">Olek</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as OrderStatus)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-xs mb-1">KM (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(Number(e.target.value) || 0)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </div>
              </div>

              {/* Totals summary */}
              <div className="border border-line p-4 grid gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Vahesumma</span>
                  <span className="font-bold">{formatEuro(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Tarne</span>
                  <span className="font-bold">{formatEuro(shippingCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">KM ({vatPercent}%)</span>
                  <span className="font-bold">{formatEuro(vatAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 mt-1">
                  <span className="font-bold">Kokku</span>
                  <span className="font-heading text-lg">{formatEuro(total)} €</span>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-line flex gap-3 justify-end bg-soft/30">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-5 py-2.5 border border-line text-sm font-bold hover:bg-soft disabled:opacity-50"
              >
                Tühista
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 border border-accent bg-white text-accent text-sm font-bold hover:bg-accent hover:text-white disabled:opacity-50"
              >
                {isPending ? "Loon..." : "Loo tellimus"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
