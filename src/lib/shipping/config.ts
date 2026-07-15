export interface ShippingRate {
  carrier: string;
  method: string;
  price: number;
  freeFrom: number;
  label_et: string;
  label_en: string;
}

const DEFAULT_RATES: ShippingRate[] = [
  { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat", label_en: "Omniva parcel machine" },
  { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat", label_en: "Smartpost parcel machine" },
];

export const SHIPPING_RATES: ShippingRate[] = DEFAULT_RATES;

export function getShippingRate(carrier: string): ShippingRate | undefined {
  return SHIPPING_RATES.find((r) => r.carrier === carrier);
}

export function calculateShippingCost(carrier: string, cartTotal: number): number {
  const rate = getShippingRate(carrier);
  if (!rate) return 0;
  if (cartTotal >= rate.freeFrom) return 0;
  return rate.price;
}
