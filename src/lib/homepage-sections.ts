// Esilehe sektsioonide JAGATUD definitsioon — kasutavad nii esileht
// (src/app/page.tsx, src/lib/homepage.ts) kui haldur (avalehe haldus).
// Reegel: esileht kuvab täpselt neid sektsioone, selles järjekorras —
// peidetud maagiat (nt kampaania nime ülekirjutamist) ei tohi tagasi tuua.

export type HomepageSectionSource = "newest" | "upcoming" | "sale" | "sale_open";

// Vanad väärtused, mis võivad veel salvestatud seadetes esineda — esileht
// jätab tundmatud allikad lihtsalt kuvamata (ei kuku).
export type HomepageSectionSourceLegacy = HomepageSectionSource | "category" | "manual";

export interface HomepageSection {
  id: string;
  heading: string;
  source: HomepageSectionSourceLegacy;
  productCount: number;
  viewAllHref: string;
  isVisible: boolean;
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: "default-newest", heading: "Uued raamatud", source: "newest", productCount: 5, viewAllHref: "/raamatud?sort=newest", isVisible: true },
  { id: "default-upcoming", heading: "Ilmumas", source: "upcoming", productCount: 4, viewAllHref: "/raamatud?upcoming=true", isVisible: true },
  { id: "default-sale", heading: "Soodus", source: "sale", productCount: 5, viewAllHref: "/pakkumised", isVisible: true },
  { id: "default-sale-open", heading: "Püsivalt soodsad raamatud", source: "sale_open", productCount: 5, viewAllHref: "/raamatud?sale=true&sale_start=always&sale_end=open", isVisible: true },
];

export const SECTION_SOURCE_OPTIONS: { value: HomepageSectionSource; label: string; hint: string }[] = [
  { value: "newest", label: "Uusimad", hint: "Viimati ilmunud raamatud (ilmumiskuupäeva järgi)." },
  { value: "upcoming", label: "Ilmumas", hint: "Tooted, millel on halduris märge „Ilmumas“. Kui ilmuvaid pole, sektsiooni esilehel ei kuvata." },
  { value: "sale", label: "Soodustusega", hint: "Kõik tooted, millel kehtib soodushind (ka kampaania kuupäevadega)." },
  { value: "sale_open", label: "Püsivalt soodsad", hint: "Tooted, millel on soodushind ilma kampaania kuupäevadeta." },
];

export const SECTION_SOURCE_LINK_LABELS: Record<string, string> = {
  newest: "Kõik uued raamatud",
  upcoming: "Kõik ilmuvad",
  sale: "Kõik pakkumised",
  sale_open: "Kõik soodsad raamatud",
};
