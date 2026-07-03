"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

const heroSchema = z.object({
  versionName: z.string().optional(),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  subtext: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  secondaryLabel: z.string().optional(),
  secondaryHref: z.string().optional(),
  desktopImage: z.string().optional(),
  mobileImage: z.string().optional(),
  bgClass: z.string().optional(),
  showSearch: z.coerce.boolean().optional(),
  isPublished: z.coerce.boolean().optional(),
});

export async function saveHeroSettings(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = heroSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };

  const db = createAdminClient();

  const { data: existing } = await db.schema("content").from("homepage")
    .select("key").eq("key", "default").maybeSingle();

  const record = { hero: parsed.data, updated_at: new Date().toISOString() };
  let result;
  if (existing) {
    result = await db.schema("content").from("homepage")
      .update(record).eq("key", "default");
  } else {
    result = await db.schema("content").from("homepage")
      .insert({ key: "default", ...record });
  }

  if (result.error) {
    console.error("saveHeroSettings error:", result.error);
    return { error: `Salvestamine eba\u00f5nnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };
  }

  revalidatePath("/");
  revalidatePath("/haldus/avaleht");
  return { success: true };
}

export async function getHomepageSettings() {
  await requireAdminSession(["viewer", "editor", "admin"]);
  const db = createAdminClient();
  const { data } = await db.schema("content").from("homepage")
    .select("hero, cards, sections, updated_at")
    .eq("key", "default")
    .maybeSingle();
  return { hero: (data?.hero ?? null) as Record<string, unknown> | null };
}

export async function getPublicHomepageHero() {
  const db = createAdminClient();
  const { data } = await db.schema("content").from("homepage")
    .select("hero")
    .eq("key", "default")
    .maybeSingle();
  return { hero: (data?.hero ?? null) as Record<string, unknown> | null };
}
