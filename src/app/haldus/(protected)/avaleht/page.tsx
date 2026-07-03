"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormField } from "@/components/admin/FormField";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface HeroConfig {
  versionName: string;
  eyebrow: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  desktopImage: string;
  mobileImage: string;
  bgClass: string;
  showSearch: boolean;
  isPublished: boolean;
}

interface HeroCard {
  id: string;
  label: string;
  heading: string;
  description: string;
  linkHref: string;
  desktopImage: string;
  mobileImage: string;
  position: number;
}

interface Section {
  id: string;
  heading: string;
  source: "newest" | "upcoming" | "sale" | "category" | "manual";
  productCount: number;
  viewAllHref: string;
  isVisible: boolean;
}

export default function HomepageAdminPage() {
  const [tab, setTab] = useState<"hero" | "cards" | "sections">("hero");

  const [hero, setHero] = useState<HeroConfig>({
    versionName: "",
    eyebrow: "",
    heading: "",
    subtext: "",
    ctaLabel: "",
    ctaHref: "",
    secondaryLabel: "",
    secondaryHref: "",
    desktopImage: "",
    mobileImage: "",
    bgClass: "bg-[#f2eee6]",
    showSearch: true,
    isPublished: false,
  });

  const [cards, setCards] = useState<HeroCard[]>([
    { id: "1", label: "Ajalugu", heading: "Eesti ajaloo suurteosed", description: "Avasta meie ajalooraamatute kollektsiooni.", linkHref: "/raamatud?category=ajalugu", desktopImage: "", mobileImage: "", position: 1 },
    { id: "2", label: "Lastele", heading: "Lasteraamatud igas vanuses", description: "Põnevad lood ja kaunid illustratsioonid.", linkHref: "/raamatud?category=laste-ja-noorteraamatud", desktopImage: "", mobileImage: "", position: 2 },
    { id: "3", label: "Hobi", heading: "Hobiaiandus ja käsitöö", description: "Praktilised nõuanded ja inspiratsioon.", linkHref: "/raamatud?category=kasiraamatud", desktopImage: "", mobileImage: "", position: 3 },
  ]);

  const [sections, setSections] = useState<Section[]>([
    { id: "1", heading: "Uued raamatud", source: "newest", productCount: 8, viewAllHref: "/raamatud", isVisible: true },
    { id: "2", heading: "Ilmumas", source: "upcoming", productCount: 4, viewAllHref: "/raamatud", isVisible: true },
    { id: "3", heading: "Pakkumised", source: "sale", productCount: 4, viewAllHref: "/pakkumised", isVisible: true },
  ]);

  function updateHeroField(field: keyof HeroConfig, value: string | boolean) {
    setHero((prev) => ({ ...prev, [field]: value }));
  }

  function updateCard(id: string, field: keyof HeroCard, value: string | number) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function updateSection(id: string, field: keyof Section, value: string | number | boolean) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  return (
    <>
      <AdminPageHeader
        title="Avalehe haldus"
        description="Hero ala, esiletõstetud kaartide ja kodulehe sektsioonide redigeerimine."
        breadcrumbs={[{ label: "Ülevaade", href: "/haldus" }, { label: "Avaleht" }]}
      />

      <div className="flex border-b border-line mb-6">
        {(["hero", "cards", "sections"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t === "hero" ? "Hero ala" : t === "cards" ? "Esiletõstetud kaardid" : "Sektsioonid"}
          </button>
        ))}
      </div>

      {/* Hero editor */}
      {tab === "hero" && (
        <div className="max-w-3xl grid gap-5">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge variant={hero.isPublished ? "published" : "draft"} />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={hero.isPublished} onChange={(e) => updateHeroField("isPublished", e.target.checked)} className="accent-ink h-4 w-4" />
              Avaldatud
            </label>
          </div>

          <FormField label="Versiooni nimi">
            <input value={hero.versionName} onChange={(e) => updateHeroField("versionName", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Suvine kampaania 2026" />
          </FormField>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <FormField label="Eelpealkiri (eyebrow)">
              <input value={hero.eyebrow} onChange={(e) => updateHeroField("eyebrow", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Uus kataloog" />
            </FormField>
            <FormField label="Pealkiri">
              <input value={hero.heading} onChange={(e) => updateHeroField("heading", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Peamine pealkiri" />
            </FormField>
          </div>

          <FormField label="Alatekst">
            <textarea value={hero.subtext} onChange={(e) => updateHeroField("subtext", e.target.value)} rows={3} className="border border-line bg-paper p-3 text-sm font-normal" />
          </FormField>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <FormField label="Peamine nupp (silt)">
              <input value={hero.ctaLabel} onChange={(e) => updateHeroField("ctaLabel", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Vaata kataloogi" />
            </FormField>
            <FormField label="Peamine nupp (URL)">
              <input value={hero.ctaHref} onChange={(e) => updateHeroField("ctaHref", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="/raamatud" />
            </FormField>
            <FormField label="Teisene nupp (silt)">
              <input value={hero.secondaryLabel} onChange={(e) => updateHeroField("secondaryLabel", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
            <FormField label="Teisene nupp (URL)">
              <input value={hero.secondaryHref} onChange={(e) => updateHeroField("secondaryHref", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <FormField label="Lauaarvuti pilt (failinimi)">
              <input value={hero.desktopImage} onChange={(e) => updateHeroField("desktopImage", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
            <FormField label="Mobiili pilt (failinimi)">
              <input value={hero.mobileImage} onChange={(e) => updateHeroField("mobileImage", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={hero.showSearch} onChange={(e) => updateHeroField("showSearch", e.target.checked)} className="accent-ink h-4 w-4" />
            Näita otsingukasti
          </label>

          <button className="justify-self-start min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50">
            Salvesta hero seaded
          </button>
        </div>
      )}

      {/* Hero cards */}
      {tab === "cards" && (
        <div className="grid gap-5 max-w-3xl">
          {cards.map((card) => (
            <div key={card.id} className="border border-line bg-panel p-5 grid gap-4">
              <h3 className="font-heading text-lg">Kaart: {card.label} <span className="text-xs text-muted">(positsioon {card.position})</span></h3>
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <FormField label="Silt">
                  <input value={card.label} onChange={(e) => updateCard(card.id, "label", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
                <FormField label="Positsioon">
                  <input type="number" value={card.position} onChange={(e) => updateCard(card.id, "position", parseInt(e.target.value) || 0)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
              </div>
              <FormField label="Pealkiri">
                <input value={card.heading} onChange={(e) => updateCard(card.id, "heading", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
              </FormField>
              <FormField label="Kirjeldus">
                <textarea value={card.description} onChange={(e) => updateCard(card.id, "description", e.target.value)} rows={2} className="border border-line bg-paper p-2 text-sm font-normal" />
              </FormField>
              <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                <FormField label="URL">
                  <input value={card.linkHref} onChange={(e) => updateCard(card.id, "linkHref", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
                <FormField label="Lauaarvuti pilt">
                  <input value={card.desktopImage} onChange={(e) => updateCard(card.id, "desktopImage", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
                <FormField label="Mobiili pilt">
                  <input value={card.mobileImage} onChange={(e) => updateCard(card.id, "mobileImage", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
              </div>
            </div>
          ))}
          <button className="justify-self-start min-h-10 px-6 border border-line font-bold text-sm hover:bg-soft">
            + Lisa kaart
          </button>
          <button className="justify-self-start min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80">
            Salvesta kaardid
          </button>
        </div>
      )}

      {/* Sections */}
      {tab === "sections" && (
        <div className="grid gap-5 max-w-3xl">
          {sections.map((section) => (
            <div key={section.id} className="border border-line bg-panel p-5 grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg">{section.heading || "Uus sektsioon"}</h3>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={section.isVisible} onChange={(e) => updateSection(section.id, "isVisible", e.target.checked)} className="accent-ink h-4 w-4" />
                  Nähtav
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                <FormField label="Pealkiri">
                  <input value={section.heading} onChange={(e) => updateSection(section.id, "heading", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
                <FormField label="Allikas">
                  <select value={section.source} onChange={(e) => updateSection(section.id, "source", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal">
                    <option value="newest">Uusimad</option>
                    <option value="upcoming">Ilmumas</option>
                    <option value="sale">Soodustusega</option>
                    <option value="category">Kategooriast</option>
                    <option value="manual">Käsitsi valitud</option>
                  </select>
                </FormField>
                <FormField label="Toodete arv">
                  <input type="number" min="1" max="12" value={section.productCount} onChange={(e) => updateSection(section.id, "productCount", parseInt(e.target.value) || 4)} className="border border-line bg-paper p-2 text-sm font-normal" />
                </FormField>
              </div>
              <FormField label="Vaata kõiki (URL)">
                <input value={section.viewAllHref} onChange={(e) => updateSection(section.id, "viewAllHref", e.target.value)} className="border border-line bg-paper p-2 text-sm font-normal" />
              </FormField>
            </div>
          ))}
          <button className="justify-self-start min-h-10 px-6 border border-line font-bold text-sm hover:bg-soft">
            + Lisa sektsioon
          </button>
          <button className="justify-self-start min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80">
            Salvesta sektsioonid
          </button>
        </div>
      )}
    </>
  );
}
