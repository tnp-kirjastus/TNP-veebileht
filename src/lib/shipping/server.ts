import "server-only";

import { getStoreSettings } from "@/lib/settings";
import type { ShippingRate } from "./config";

const DEFAULT_RATES: ShippingRate[] = [
  { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat" },
  { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat" },
];

export async function getShippingRates(): Promise<ShippingRate[]> {
  try {
    const settings = await getStoreSettings();
    return settings.shipping.rates.length > 0 ? settings.shipping.rates : DEFAULT_RATES;
  } catch {
    return DEFAULT_RATES;
  }
}

export async function calculateShippingCostAsync(carrier: string, cartTotal: number): Promise<number> {
  const rates = await getShippingRates();
  const rate = rates.find((r) => r.carrier === carrier);
  if (!rate) return 0;
  if (cartTotal >= rate.freeFrom) return 0;
  return rate.price;
}
