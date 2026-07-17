import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type HomepageHeroData = {
  heading: string;
  headingSize: string;
  subtext: string;
  showSearch: boolean;
  desktopImage: string | null;
  mobileImage: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  eyebrow: string | null;
};

function safeHeadingSize(value: unknown): string {
  const compact = String(value ?? "").trim().replace(/[\r\n\t\s]+/g, "");
  if (/^clamp\(\d{2}px,\d+(?:\.\d+)?vw,\d{2}px\)$/.test(compact)) return compact;
  if (/^\d{2}px$/.test(compact)) return compact;
  return "clamp(50px,6vw,71px)";
}

function cleanMediaUrl(value: unknown): string | null {
  if (!value) return null;
  const cleaned = String(value).trim().replace(/[\r\n\t]+/g, "");
  return /^https?:\/\//.test(cleaned) || cleaned.startsWith("/") ? cleaned : null;
}

export async function getHomepageHero(): Promise<HomepageHeroData | null> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.schema("content").from("homepage")
      .select("hero")
      .eq("key", "default")
      .maybeSingle();
    if (error) {
      console.error("getHomepageHero fetch error:", error);
      return null;
    }
    const hero = (data?.hero ?? null) as Record<string, unknown> | null;
    if (!hero || !hero.heading) {
      console.warn("getHomepageHero: no hero data", { hasData: !!data, hasHero: !!hero });
      return null;
    }
    return {
      heading: String(hero.heading ?? ""),
      headingSize: safeHeadingSize(hero.headingSize),
      subtext: String(hero.subtext ?? ""),
      showSearch: hero.showSearch !== false,
      desktopImage: cleanMediaUrl(hero.desktopImage),
      mobileImage: cleanMediaUrl(hero.mobileImage),
      ctaLabel: hero.ctaLabel ? String(hero.ctaLabel) : null,
      ctaHref: hero.ctaHref ? String(hero.ctaHref) : null,
      secondaryLabel: hero.secondaryLabel ? String(hero.secondaryLabel) : null,
      secondaryHref: hero.secondaryHref ? String(hero.secondaryHref) : null,
      eyebrow: hero.eyebrow ? String(hero.eyebrow) : null,
    };
  } catch (err) {
    console.error("getHomepageHero unexpected error:", err);
    return null;
  }
}

export type HomepageCard = {
  id: string;
  label: string;
  heading: string;
  description: string;
  linkHref: string;
  desktopImage: string;
  mobileImage: string;
  position: number;
};

export async function getHomepageCards(): Promise<HomepageCard[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.schema("content").from("homepage")
      .select("cards")
      .eq("key", "default")
      .maybeSingle();
    const cards = data?.cards as Record<string, unknown>[] | null;
    if (!cards || !Array.isArray(cards)) return [];
    return (cards as unknown as HomepageCard[]).sort((a, b) => a.position - b.position);
  } catch (err) {
    console.error("getHomepageCards error:", err);
    return [];
  }
}

export type HomepageSection = {
  id: string;
  heading: string;
  source: "newest" | "upcoming" | "sale" | "category" | "manual";
  productCount: number;
  viewAllHref: string;
  isVisible: boolean;
};

export async function getHomepageSections(): Promise<HomepageSection[]> {
  try {
    const db = createAdminClient();
    const { data } = await db.schema("content").from("homepage")
      .select("sections")
      .eq("key", "default")
      .maybeSingle();
    const sections = data?.sections as Record<string, unknown>[] | null;
    if (!sections || !Array.isArray(sections)) return [];
    return sections as unknown as HomepageSection[];
  } catch (err) {
    console.error("getHomepageSections error:", err);
    return [];
  }
}
