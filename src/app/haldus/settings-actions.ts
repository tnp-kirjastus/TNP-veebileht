"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

const shippingRateSchema = z.object({
  carrier: z.string().min(1),
  method: z.string().min(1),
  price: z.number().min(0),
  freeFrom: z.number().min(0),
  label_et: z.string().min(1),
  label_en: z.string().optional(),
});

const shippingApiSchema = z.object({
  maksekeskusLiveUrl: z.string().min(1),
  maksekeskusTestUrl: z.string().min(1),
  parcelMachineType: z.string().min(1),
  parcelMachineCountryFilter: z.string().min(1),
});

const shippingSchema = z.object({
  rates: z.array(shippingRateSchema),
  api: shippingApiSchema,
});

const notificationsSchema = z.record(z.string(), z.boolean()).optional();

const emailStatusTemplateSchema = z.object({
  subject: z.string().min(1),
  heading: z.string().min(1),
  bodyHtml: z.string().min(1),
});

const statusTemplatesSchema = z.record(z.string(), emailStatusTemplateSchema).optional();

const emailSchema = z.object({
  fromAddress: z.string().min(1),
  orderSubject: z.string().min(1),
  orderBody: z.string().min(1),
  contactEmail: z.string().min(1),
  notifications: notificationsSchema,
  statusTemplates: statusTemplatesSchema,
});


const vatSchema = z.object({
  percent: z.number().min(0).max(100),
});

const companySchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  regCode: z.string(),
});

const socialSchema = z.object({
  facebook: z.string(),
  instagram: z.string(),
});

const themeSchema = z.object({
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColorDark: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const settingsSchema = z.object({
  shipping: shippingSchema,
  email: emailSchema,
  vat: vatSchema,
  company: companySchema,
  social: socialSchema,
  theme: themeSchema,
});

export type StoreSettings = z.infer<typeof settingsSchema>;

const FALLBACK_SHIPPING = {
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
};

function resolveShipping(raw: unknown): StoreSettings["shipping"] {
  const obj = raw as { rates?: unknown[]; api?: Record<string, unknown> } | null;
  if (obj?.rates && Array.isArray(obj.rates) && obj.rates.length > 0) {
    return obj as StoreSettings["shipping"];
  }
  return FALLBACK_SHIPPING;
}

const DEFAULT_STATUS_TEMPLATES: Record<string, { subject: string; heading: string; bodyHtml: string }> = {
  pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
  payment_pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
  paid: { subject: "Tellimus {{orderNumber}} makse kinnitatud", heading: "Aitäh tellimuse eest!", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.</p>" },
  processing: { subject: "Tellimus {{orderNumber}} on töötlemisel", heading: "Tellimus on töötlemisel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.</p>" },
  shipped: { subject: "Tellimus {{orderNumber}} on saadetud", heading: "Tellimus on saadetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on üle antud kullerile ja on teel Teieni.</p>" },
  delivered: { subject: "Tellimus {{orderNumber}} on kohale toimetatud", heading: "Tellimus on kohale toimetatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on kohale toimetatud. Täname ostu eest!</p>" },
  cancelled: { subject: "Tellimus {{orderNumber}} on tühistatud", heading: "Tellimus on tühistatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.</p>" },
  payment_failed: { subject: "Tellimus {{orderNumber}} makse ebaõnnestus", heading: "Makse ebaõnnestus", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> makse ebaõnnestus. Palun proovige uuesti.</p>" },
  expired: { subject: "Tellimus {{orderNumber}} on aegunud", heading: "Tellimus on aegunud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> on aegunud. Soovi korral saate teha uue tellimuse.</p>" },
  manual_review: { subject: "Tellimus {{orderNumber}} on ülevaatusel", heading: "Tellimus on ülevaatusel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.</p>" },
  refunded: { subject: "Tellimus {{orderNumber}} on tagastatud", heading: "Tellimus on tagastatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> summa on tagastatud.</p>" },
  preorder: { subject: "Ettetellimus {{orderNumber}} vastu võetud", heading: "Ettetellimus vastu võetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie ettetellimus <strong>#{{orderNumber}}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.</p>" },
};

export async function getStoreSettingsAdmin(): Promise<StoreSettings> {
  await requireAdminSession(["editor", "admin"]);

  const db = createAdminClient();
  const { data, error } = await db.schema("content").from("settings")
    .select("shipping, email, vat, company, social, theme")
    .eq("key", "store")
    .maybeSingle();

  if (error || !data) {
    console.error("getStoreSettingsAdmin error:", error?.message);
    return {
      shipping: FALLBACK_SHIPPING,
      email: {
        fromAddress: "",
        orderSubject: "",
        orderBody: "",
        contactEmail: "",
        notifications: {},
        statusTemplates: DEFAULT_STATUS_TEMPLATES,
      },
      vat: { percent: 9 },
      company: { name: "", email: "", phone: "", address: "", regCode: "" },
      social: { facebook: "", instagram: "" },
      theme: { accentColor: "#4a1aa1", accentColorDark: "#31106c" },
    };
  }

  const emailRaw = (data.email as Record<string, unknown> | null) ?? {};

  return {
    shipping: resolveShipping(data.shipping),
    email: {
      fromAddress: (emailRaw.fromAddress as string) || "",
      orderSubject: (emailRaw.orderSubject as string) || "",
      orderBody: (emailRaw.orderBody as string) || "",
      contactEmail: (emailRaw.contactEmail as string) || "",
      notifications: (emailRaw.notifications as Record<string, boolean>) ?? {},
      statusTemplates: (emailRaw.statusTemplates as Record<string, { subject: string; heading: string; bodyHtml: string }>) ?? DEFAULT_STATUS_TEMPLATES,
    },
    vat: (data.vat ?? { percent: 9 }) as StoreSettings["vat"],
    company: (data.company ?? { name: "", email: "", phone: "", address: "", regCode: "" }) as StoreSettings["company"],
    social: (data.social ?? { facebook: "", instagram: "" }) as StoreSettings["social"],
    theme: (data.theme ?? { accentColor: "#4a1aa1", accentColorDark: "#31106c" }) as StoreSettings["theme"],
  };
}

export async function saveStoreSettings(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  await requireAdminSession(["admin"]);

  const raw = formData.get("settings");
  if (typeof raw !== "string") {
    return { error: "Puuduvad andmed." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Vigane JSON." };
  }

  const parsed = settingsSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  }

  const db = createAdminClient();

  const payload = {
    key: "store",
    shipping: parsed.data.shipping as unknown as Record<string, unknown>,
    email: parsed.data.email as unknown as Record<string, unknown>,
    vat: parsed.data.vat as unknown as Record<string, unknown>,
    company: parsed.data.company as unknown as Record<string, unknown>,
    social: parsed.data.social as unknown as Record<string, unknown>,
    theme: parsed.data.theme as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  let { error } = await db.schema("content").from("settings")
    .upsert(payload, { onConflict: "key" });

  if (error && error.message?.includes("theme")) {
    const { theme: _t, ...rest } = payload;
    const retry = await db.schema("content").from("settings")
      .upsert(rest, { onConflict: "key" });
    error = retry.error;
  }

  if (error) {
    console.error("saveStoreSettings error:", error);
    return { error: `Salvestamine ebaõnnestus: ${error.message || error.code || "tundmatu viga"}` };
  }

  revalidatePath("/haldus/seaded");
  return { success: true };
}
