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
  return value.toFixed(2) + " \u20AC";
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("et-EE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
