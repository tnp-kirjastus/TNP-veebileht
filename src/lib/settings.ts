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

interface ShippingApi {
  maksekeskusLiveUrl: string;
  maksekeskusTestUrl: string;
  parcelMachineType: string;
  parcelMachineCountryFilter: string;
}

interface EmailStatusTemplate {
  subject: string;
  heading: string;
  bodyHtml: string;
}

interface StoreSettings {
  shipping: { rates: ShippingRate[]; api: ShippingApi };
  email: {
    fromAddress: string;
    orderSubject: string;
    orderBody: string;
    contactEmail: string;
    notifications?: Record<string, boolean>;
    statusTemplates?: Record<string, EmailStatusTemplate>;
  };
  vat: { percent: number };
  company: { name: string; email: string; phone: string; address: string; regCode: string };
  social: { facebook: string; instagram: string };
  theme: { accentColor: string; accentColorDark: string };
}

const DEFAULT_STATUS_TEMPLATES: Record<string, EmailStatusTemplate> = {
  pending: {
    subject: "Tellimus {{orderNumber}} ootab makset",
    heading: "Tellimus ootab makset",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.</p>",
  },
  payment_pending: {
    subject: "Tellimus {{orderNumber}} ootab makset",
    heading: "Tellimus ootab makset",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.</p>",
  },
  paid: {
    subject: "Tellimus {{orderNumber}} makse kinnitatud",
    heading: "Aitäh tellimuse eest!",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.</p>",
  },
  processing: {
    subject: "Tellimus {{orderNumber}} on töötlemisel",
    heading: "Tellimus on töötlemisel",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.</p>",
  },
  shipped: {
    subject: "Tellimus {{orderNumber}} on saadetud",
    heading: "Tellimus on saadetud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on üle antud kullerile ja on teel Teieni.</p>",
  },
  delivered: {
    subject: "Tellimus {{orderNumber}} on kohale toimetatud",
    heading: "Tellimus on kohale toimetatud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on kohale toimetatud. Täname ostu eest!</p>",
  },
  cancelled: {
    subject: "Tellimus {{orderNumber}} on tühistatud",
    heading: "Tellimus on tühistatud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.</p>",
  },
  payment_failed: {
    subject: "Tellimus {{orderNumber}} makse ebaõnnestus",
    heading: "Makse ebaõnnestus",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> makse ebaõnnestus. Palun proovige uuesti.</p>",
  },
  expired: {
    subject: "Tellimus {{orderNumber}} on aegunud",
    heading: "Tellimus on aegunud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> on aegunud. Soovi korral saate teha uue tellimuse.</p>",
  },
  manual_review: {
    subject: "Tellimus {{orderNumber}} on ülevaatusel",
    heading: "Tellimus on ülevaatusel",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.</p>",
  },
  refunded: {
    subject: "Tellimus {{orderNumber}} on tagastatud",
    heading: "Tellimus on tagastatud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> summa on tagastatud.</p>",
  },
  preorder: {
    subject: "Ettetellimus {{orderNumber}} vastu võetud",
    heading: "Ettetellimus vastu võetud",
    bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie ettetellimus <strong>#{{orderNumber}}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.</p>",
  },
};

const DEFAULTS: StoreSettings = {
  shipping: {
    rates: [
      { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat" },
      { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat" },
    ],
    api: {
      maksekeskusLiveUrl: "https://api.maksekeskus.ee",
      maksekeskusTestUrl: "https://api.test.maksekeskus.ee",
      parcelMachineType: "APT,PUP",
      parcelMachineCountryFilter: "ee",
    },
  },
  email: {
    fromAddress: "tellimused@tnp.ee",
    orderSubject: "Tellimus {{orderNumber}} kinnitatud",
    orderBody: "Tere {{customerName}}!\n\nSinu tellimus nr {{orderNumber}} summas {{total}} € on kinnitatud.\n\nTellitud raamatud:\n{{itemLines}}\n\nSaadame raamatud esimesel võimalusel. Tarne kohta saadame eraldi teavituse.\n\nKüsimuste korral kirjuta: tellimused@tnp.ee\n\nKirjastus Tänapäev",
    contactEmail: "tellimused@tnp.ee",
    notifications: Object.fromEntries(
      Object.keys(DEFAULT_STATUS_TEMPLATES).map((k) => [`notify_${k}`, true]),
    ),
    statusTemplates: DEFAULT_STATUS_TEMPLATES,
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
      .select("shipping, email, vat, company, social")
      .eq("key", "store")
      .maybeSingle();

    if (error || !data) {
      console.warn("getStoreSettings: falling back to defaults", error?.message);
      cached = DEFAULTS;
      cacheTime = now;
      return DEFAULTS;
    }

    const shippingRaw = (data.shipping as Record<string, unknown> | null);
    const shippingRates = (shippingRaw?.rates as ShippingRate[] | null) ?? DEFAULTS.shipping.rates;
    const shippingApiRaw = (shippingRaw?.api as Record<string, unknown> | null);

    const emailRaw = (data.email as Record<string, unknown> | null);
    const statusTemplatesRaw = (emailRaw?.statusTemplates as Record<string, EmailStatusTemplate> | null);

    cached = {
      shipping: {
        rates: shippingRates,
        api: {
          maksekeskusLiveUrl: (shippingApiRaw?.maksekeskusLiveUrl as string) || DEFAULTS.shipping.api.maksekeskusLiveUrl,
          maksekeskusTestUrl: (shippingApiRaw?.maksekeskusTestUrl as string) || DEFAULTS.shipping.api.maksekeskusTestUrl,
          parcelMachineType: (shippingApiRaw?.parcelMachineType as string) || DEFAULTS.shipping.api.parcelMachineType,
          parcelMachineCountryFilter: (shippingApiRaw?.parcelMachineCountryFilter as string) || DEFAULTS.shipping.api.parcelMachineCountryFilter,
        },
      },
      email: {
        fromAddress: (emailRaw?.fromAddress as string) || DEFAULTS.email.fromAddress,
        orderSubject: (emailRaw?.orderSubject as string) || DEFAULTS.email.orderSubject,
        orderBody: (emailRaw?.orderBody as string) || DEFAULTS.email.orderBody,
        contactEmail: (emailRaw?.contactEmail as string) || DEFAULTS.email.contactEmail,
        notifications: (emailRaw?.notifications as Record<string, boolean> | null) ?? DEFAULTS.email.notifications,
        statusTemplates: statusTemplatesRaw ?? DEFAULTS.email.statusTemplates,
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
      theme: DEFAULTS.theme,
    };
    cacheTime = now;
    return cached;
  } catch (err) {
    console.warn("getStoreSettings: error, falling back to defaults", err);
    return DEFAULTS;
  }
}

export type { StoreSettings, ShippingRate, ShippingApi, EmailStatusTemplate };
