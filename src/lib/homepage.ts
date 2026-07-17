import "server-only";

<<<<<<< HEAD
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
      headingSize: String(hero.headingSize || "clamp(56px,6vw,71px)"),
      subtext: String(hero.subtext ?? ""),
      showSearch: hero.showSearch !== false,
      desktopImage: hero.desktopImage ? String(hero.desktopImage) : null,
      mobileImage: hero.mobileImage ? String(hero.mobileImage) : null,
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
=======
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export const getHomepageHero = cache(async (): Promise<{
  heading: string;
  subtext: string;
  showSearch: boolean;
} | null> => {
  try {
    const db = createAdminClient();
    const { data } = await db.schema("content").from("homepage")
      .select("hero")
      .eq("key", "default")
      .maybeSingle();
    const hero = (data?.hero ?? null) as Record<string, unknown> | null;
    if (!hero || !hero.heading) return null;
    return {
      heading: String(hero.heading ?? ""),
      subtext: String(hero.subtext ?? ""),
      showSearch: hero.showSearch !== false,
    };
  } catch {
    return null;
  }
});
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
