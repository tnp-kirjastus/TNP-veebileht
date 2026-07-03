import "server-only";

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
