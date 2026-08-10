/**
 * Puhas tarnehinna arvutus — ühine kliendile ja serverile.
 * Tarnehinnad ise elavad AINULT andmebaasis (content.settings) ja
 * adminis hallatavad; siia ei kirjutata ühtegi konstanti.
 */
export interface ShippingRate {
  carrier: string;
  method: string;
  price: number;
  freeFrom: number;
  label_et: string;
  label_en?: string;
}

export function shippingCostForRate(rate: ShippingRate | undefined, cartTotal: number): number {
  if (!rate) return 0;
  if (cartTotal >= rate.freeFrom) return 0;
  return rate.price;
}
