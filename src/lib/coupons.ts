import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { roundEuro } from "@/lib/money";

export interface CouponResult {
  code: string;
  discount: number;
  label: string;
}

/**
 * Kupongid elavad andmebaasis (commerce.coupons) ja on hallatavad adminis.
 * Checkout'i tegelik allahindlus arvutatakse alati RPC-s commerce.checkout_cart;
 * see funktsioon on ainult eelkontrolliks kassa vormis.
 */
export async function validateCoupon(code: string | undefined, subtotal: number): Promise<CouponResult | null> {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;

  const { data } = await createAdminClient()
    .schema("commerce")
    .from("coupons")
    .select("code, percent, max_discount")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  const percent = Number((data as { percent: number }).percent);
  const maxDiscount = Number((data as { max_discount: number }).max_discount);
  return {
    code: normalized,
    discount: roundEuro(Math.min((subtotal * percent) / 100, maxDiscount)),
    label: `-${percent}% (max ${maxDiscount} EUR)`,
  };
}
