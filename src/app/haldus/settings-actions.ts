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

const shippingSchema = z.object({
  rates: z.array(shippingRateSchema),
});

const notificationsSchema = z.record(z.string(), z.boolean()).optional();

const emailSchema = z.object({
  fromAddress: z.string().min(1),
  orderSubject: z.string().min(1),
  orderBody: z.string().min(1),
  notifications: notificationsSchema,
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
};

function resolveShipping(raw: unknown): StoreSettings["shipping"] {
  const obj = raw as { rates?: unknown[] } | null;
  if (obj?.rates && Array.isArray(obj.rates) && obj.rates.length > 0) {
    return obj as StoreSettings["shipping"];
  }
  return FALLBACK_SHIPPING;
}

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
      email: { fromAddress: "", orderSubject: "", orderBody: "" },
      vat: { percent: 9 },
      company: { name: "", email: "", phone: "", address: "", regCode: "" },
      social: { facebook: "", instagram: "" },
      theme: { accentColor: "#4a1aa1", accentColorDark: "#31106c" },
    };
  }

  return {
    shipping: resolveShipping(data.shipping),
    email: (data.email ?? { fromAddress: "", orderSubject: "", orderBody: "" }) as StoreSettings["email"],
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
  const { error } = await db.schema("content").from("settings")
    .upsert({
      key: "store",
      shipping: parsed.data.shipping as unknown as Record<string, unknown>,
      email: parsed.data.email as unknown as Record<string, unknown>,
      vat: parsed.data.vat as unknown as Record<string, unknown>,
      company: parsed.data.company as unknown as Record<string, unknown>,
      social: parsed.data.social as unknown as Record<string, unknown>,
      theme: parsed.data.theme as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });

  if (error) {
    console.error("saveStoreSettings error:", error);
    return { error: `Salvestamine ebaõnnestus: ${error.message || error.code || "tundmatu viga"}` };
  }

  revalidatePath("/haldus/seaded");
  return { success: true };
}
