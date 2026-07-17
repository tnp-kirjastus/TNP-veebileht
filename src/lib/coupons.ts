import { roundEuro } from "@/lib/money";

export interface CouponResult {
  code: string;
  discount: number;
  label: string;
}

export function validateCoupon(code: string | undefined, subtotal: number): CouponResult | null {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;

  if (normalized === "TNP2026") {
    return {
      code: normalized,
      discount: roundEuro(Math.min(subtotal * 0.1, 50)),
      label: "-10% (max 50 EUR)",
    };
  }

  return null;
}
