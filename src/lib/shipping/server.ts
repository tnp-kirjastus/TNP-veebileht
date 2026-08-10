import "server-only";

import { getStoreSettings } from "@/lib/settings";
import { shippingCostForRate, type ShippingRate } from "./calc";

export async function getShippingRates(): Promise<ShippingRate[]> {
  const settings = await getStoreSettings();
  return settings.shipping.rates;
}

export async function calculateShippingCostAsync(carrier: string, cartTotal: number): Promise<number> {
  const rates = await getShippingRates();
  return shippingCostForRate(rates.find((r) => r.carrier === carrier), cartTotal);
}

export type { ShippingRate };
