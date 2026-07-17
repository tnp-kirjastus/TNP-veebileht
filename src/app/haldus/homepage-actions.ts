"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

function cleanSingleLine(value: string): string {
  return value.trim().replace(/[\r\n\t]+/g, "");
}

function safeHeadingSize(value: string): string {
  const compact = cleanSingleLine(value).replace(/\s+/g, "");
  const clampMatch = compact.match(/^clamp\((\d{2})px,(\d+(?:\.\d+)?)vw,(\d{2})px\)$/);
  if (clampMatch) {
    const minimum = Math.min(96, Math.max(28, Number(clampMatch[1])));
    const viewport = Math.min(10, Math.max(1, Number(clampMatch[2])));
    const maximum = Math.min(96, Math.max(36, Number(clampMatch[3])));
    return `clamp(${Math.min(minimum, maximum)}px,${viewport}vw,${maximum}px)`;
  }
  const pixelMatch = compact.match(/^(\d{2})px$/);
  if (pixelMatch) {
    const maximum = Math.min(96, Math.max(36, Number(pixelMatch[1])));
    return `clamp(${Math.max(28, Math.round(maximum * 0.7))}px,6vw,${maximum}px)`;
  }
  return "clamp(50px,6vw,71px)";
}

const heroSchema = z.object({
  versionName: z.string().optional(),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  headingSize: z.string().transform(safeHeadingSize).optional(),
  subtext: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().transform(cleanSingleLine).optional(),
  secondaryLabel: z.string().optional(),
  secondaryHref: z.string().transform(cleanSingleLine).optional(),
  desktopImage: z.string().transform(cleanSingleLine).optional(),
  mobileImage: z.string().transform(cleanSingleLine).optional(),
  bgClass: z.string().optional(),
  showSearch: z.string().transform((v) => v === "true").optional(),
  isPublished: z.string().transform((v) => v === "true").optional(),
});

export async function saveHeroSettings(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  try {
    await requireAdminSession(["editor", "admin"]);
    const raw = Object.fromEntries(formData.entries());
    const parsed = heroSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };

    const db = createAdminClient();

    const { data: existing, error: selectError } = await db.schema("content").from("homepage")
      .select("key").eq("key", "default").maybeSingle();

    if (selectError) {
      console.error("saveHeroSettings select error:", selectError);
      return { error: `Salvestamine ebaõnnestus: ${selectError.message || selectError.code || "tundmatu viga"}` };
    }

    const record = { hero: parsed.data, updated_at: new Date().toISOString() };
    const result = existing
      ? await db.schema("content").from("homepage").update(record).eq("key", "default")
      : await db.schema("content").from("homepage").insert({ key: "default", ...record });

    if (result.error) {
      console.error("saveHeroSettings error:", result.error);
      return { error: `Salvestamine ebaõnnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };
    }

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveHeroSettings unexpected error:", err);
    return { error: `Salvestamine ebaõnnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
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

    if (result.error) return { error: `Salvestamine ebaõnnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveCardsSettings unexpected error:", err);
    return { error: `Salvestamine ebaõnnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
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

    if (result.error) return { error: `Salvestamine ebaõnnestus: ${result.error.message || result.error.code || "tundmatu viga"}` };

    revalidatePath("/");
    revalidatePath("/haldus/avaleht");
    return { success: true };
  } catch (err) {
    console.error("saveSectionsSettings unexpected error:", err);
    return { error: `Salvestamine ebaõnnestus: ${err instanceof Error ? err.message : "tundmatu viga"}` };
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
