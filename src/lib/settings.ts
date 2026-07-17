import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

interface ShippingRate {
  carrier: string;
  method: string;
  price: number;
  freeFrom: number;
  label_et: string;
  label_en?: string;
}

interface StoreSettings {
  shipping: { rates: ShippingRate[] };
  email: {
    fromAddress: string;
    orderSubject: string;
    orderBody: string;
    notifications?: Record<string, boolean>;
  };
  vat: { percent: number };
  company: { name: string; email: string; phone: string; address: string; regCode: string };
  social: { facebook: string; instagram: string };
  theme: { accentColor: string; accentColorDark: string };
}

const DEFAULTS: StoreSettings = {
  shipping: {
    rates: [
      { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat" },
      { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat" },
    ],
  },
  email: {
    fromAddress: "Kirjastus Tänapäev <tellimused@tnp.ee>",
    orderSubject: "Tellimus {{orderNumber}} kinnitatud",
    orderBody: "Tere {{customerName}}!\n\nSinu tellimus nr {{orderNumber}} summas {{total}} € on kinnitatud.\n\nTellitud raamatud:\n{{itemLines}}\n\nSaadame raamatud esimesel võimalusel. Tarne kohta saadame eraldi teavituse.\n\nKüsimuste korral kirjuta: tellimused@tnp.ee\n\nKirjastus Tänapäev",
  },
  vat: { percent: 9 },
  company: { name: "Kirjastus Tänapäev", email: "tellimused@tnp.ee", phone: "", address: "", regCode: "" },
  social: { facebook: "", instagram: "" },
  theme: { accentColor: "#4a1aa1", accentColorDark: "#31106c" },
};

let cached: StoreSettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getStoreSettings(): Promise<StoreSettings> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) return cached;

  try {
    const db = createAdminClient();
    const { data, error } = await db.schema("content").from("settings")
      .select("shipping, email, vat, company, social, theme")
      .eq("key", "store")
      .maybeSingle();

    if (error || !data) {
      console.warn("getStoreSettings: falling back to defaults", error?.message);
      cached = DEFAULTS;
      cacheTime = now;
      return DEFAULTS;
    }

    cached = {
      shipping: { rates: (data.shipping as { rates: ShippingRate[] } | null)?.rates ?? DEFAULTS.shipping.rates },
      email: {
        fromAddress: (data.email as Record<string, unknown> | null)?.fromAddress as string || DEFAULTS.email.fromAddress,
        orderSubject: (data.email as Record<string, unknown> | null)?.orderSubject as string || DEFAULTS.email.orderSubject,
        orderBody: (data.email as Record<string, unknown> | null)?.orderBody as string || DEFAULTS.email.orderBody,
      },
      vat: { percent: (data.vat as Record<string, unknown> | null)?.percent as number ?? DEFAULTS.vat.percent },
      company: {
        name: ((data.company as Record<string, unknown> | null)?.name as string) || DEFAULTS.company.name,
        email: ((data.company as Record<string, unknown> | null)?.email as string) || DEFAULTS.company.email,
        phone: ((data.company as Record<string, unknown> | null)?.phone as string) || DEFAULTS.company.phone,
        address: ((data.company as Record<string, unknown> | null)?.address as string) || DEFAULTS.company.address,
        regCode: ((data.company as Record<string, unknown> | null)?.regCode as string) || DEFAULTS.company.regCode,
      },
      social: {
        facebook: ((data.social as Record<string, unknown> | null)?.facebook as string) || DEFAULTS.social.facebook,
        instagram: ((data.social as Record<string, unknown> | null)?.instagram as string) || DEFAULTS.social.instagram,
      },
      theme: {
        accentColor: ((data.theme as Record<string, unknown> | null)?.accentColor as string) || DEFAULTS.theme.accentColor,
        accentColorDark: ((data.theme as Record<string, unknown> | null)?.accentColorDark as string) || DEFAULTS.theme.accentColorDark,
      },
    };
    cacheTime = now;
    return cached;
  } catch (err) {
    console.warn("getStoreSettings: error, falling back to defaults", err);
    return DEFAULTS;
  }
}
