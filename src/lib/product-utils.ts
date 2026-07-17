import type { Product } from "./data-types";

export function getEffectivePrice(p: Product): number {
  if (
    p.sale_price !== null &&
    (!p.sale_start || new Date(p.sale_start) <= new Date()) &&
    (!p.sale_end || new Date(p.sale_end) >= new Date())
  ) {
    return p.sale_price;
  }
  return p.price;
}

export function isOnSale(p: Product): boolean {
  const start = p.sale_start ? new Date(p.sale_start) : null;
  const end = p.sale_end ? new Date(p.sale_end) : null;
  return (
    p.sale_price !== null &&
    p.sale_price < p.price &&
    (!start || (!Number.isNaN(start.getTime()) && start <= new Date())) &&
    (!end || (!Number.isNaN(end.getTime()) && end >= new Date()))
  );
}

export function getSalePercent(p: Product): number {
  if (!isOnSale(p) || !p.sale_price || p.price === 0) return 0;
  return Math.round(((p.price - p.sale_price) / p.price) * 100);
}

export function formatEuro(value: number): string {
<<<<<<< HEAD
  return value.toFixed(2) + " €";
=======
  return value.toFixed(2) + " \u20AC";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
<<<<<<< HEAD
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatEditions(editions: { type: string; date: string }[]): string {
  return editions
    .map(e => `${formatDate(e.date)} (${e.type})`)
    .join(", ");
=======
  return new Date(dateStr).toLocaleDateString("et-EE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
}
