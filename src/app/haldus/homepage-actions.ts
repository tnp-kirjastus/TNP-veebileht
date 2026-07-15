"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

const heroSchema = z.object({
  versionName: z.string().optional(),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  headingSize: z.string().optional(),
  subtext: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  secondaryLabel: z.string().optional(),
  secondaryHref: z.string().optional(),
  desktopImage: z.string().optional(),
  mobileImage: z.string().optional(),
  bgClass: z.string().optional(),
  showSearch: z.string().transform((v) => v === "true").optional(),
  isPublished: z.string().transform((v) => v === "true").optional(),
});

export async function saveHeroSettings(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  try {
    await requireAdminSession(["editor", "admin"]);
    const raw = Object.fromEntries(formData.entries());
    const parsed = heroSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };

    const db = createAdminClient();

    const { data: existing, error: selectError } = await db.schema("content").from("homepage")
      .select("key").eq("key", "default").maybeSingle();

    if (selectError) {
      console.error("saveHeroSettings select error:", selectError);
      return { error: `Salvestamine eba\u00f5nnestus: ${selectError.message || selectError.code || "tundmatu viga"}` };
    }

    const record = { hero: parsed.data, updated_at: new Date().toISOString() };
    const result = existing
      ? await db.schema("content").from("homepage").update(record).eq("key", "default")
      : await db.schema("content").from("homepage").insert({ key: "default", ...record });

    if (result.error) {
      console.error("saveHeroSettings error:", result.error);
      return { error: `Salvestamine eba\u00f5nnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };
    }

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveHeroSettings unexpected error:", err);
    return { error: `Salvestamine eba\u00f5nnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
  }
}

export async function getHomepageSettings() {
  try {
    await requireAdminSession(["viewer", "editor", "admin"]);
    const db = createAdminClient();
    const { data, error } = await db.schema("content").from("homepage")
      .select("hero, cards, sections, updated_at")
      .eq("key", "default")
      .maybeSingle();
    if (error) {
      console.error("getHomepageSettings error:", error);
      return { hero: null, cards: null, sections: null };
    }
    return {
      hero: (data?.hero ?? null) as Record<string, unknown> | null,
      cards: (data?.cards ?? null) as Record<string, unknown>[] | null,
      sections: (data?.sections ?? null) as Record<string, unknown>[] | null,
    };
  } catch (err) {
    console.error("getHomepageSettings unexpected error:", err);
    return { hero: null, cards: null, sections: null };
  }
}

const cardSchema = z.object({
  id: z.string(),
  label: z.string(),
  heading: z.string(),
  description: z.string(),
  linkHref: z.string(),
  desktopImage: z.string(),
  mobileImage: z.string(),
  position: z.number(),
});

const cardsSchema = z.array(cardSchema);

const sectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  source: z.enum(["newest", "upcoming", "sale", "category", "manual"]),
  productCount: z.number(),
  viewAllHref: z.string(),
  isVisible: z.boolean(),
});

const sectionsSchema = z.array(sectionSchema);

export async function saveCardsSettings(cards: unknown) {
  try {
    await requireAdminSession(["editor", "admin"]);
    const parsed = cardsSchema.safeParse(cards);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli kaarte." };

    const db = createAdminClient();
    const { data: existing } = await db.schema("content").from("homepage")
      .select("key").eq("key", "default").maybeSingle();

    const result = existing
      ? await db.schema("content").from("homepage").update({ cards: parsed.data, updated_at: new Date().toISOString() }).eq("key", "default")
      : await db.schema("content").from("homepage").insert({ key: "default", cards: parsed.data, updated_at: new Date().toISOString() });

    if (result.error) return { error: `Salvestamine eba\u00f5nnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveCardsSettings unexpected error:", err);
    return { error: `Salvestamine eba\u00f5nnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
  }
}

export async function saveSectionsSettings(sections: unknown) {
  try {
    await requireAdminSession(["editor", "admin"]);
    const parsed = sectionsSchema.safeParse(sections);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli sektsioone." };

    const db = createAdminClient();
    const { data: existing } = await db.schema("content").from("homepage")
      .select("key").eq("key", "default").maybeSingle();

    const result = existing
      ? await db.schema("content").from("homepage").update({ sections: parsed.data, updated_at: new Date().toISOString() }).eq("key", "default")
      : await db.schema("content").from("homepage").insert({ key: "default", sections: parsed.data, updated_at: new Date().toISOString() });

    if (result.error) return { error: `Salvestamine eba\u00f5nnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveSectionsSettings unexpected error:", err);
    return { error: `Salvestamine eba\u00f5nnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
  }
}

export async function getPublicHomepageHero() {
  const db = createAdminClient();
  const { data } = await db.schema("content").from("homepage")
    .select("hero")
    .eq("key", "default")
    .maybeSingle();
  return { hero: (data?.hero ?? null) as Record<string, unknown> | null };
}
