"use client";

<<<<<<< HEAD
import { useState, useEffect, useRef } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
import { useActionState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormField } from "@/components/admin/FormField";
import { StatusBadge } from "@/components/admin/StatusBadge";
<<<<<<< HEAD
import { saveHeroSettings, getHomepageSettings, saveCardsSettings, saveSectionsSettings } from "@/app/haldus/homepage-actions";
=======
import { saveHeroSettings, getHomepageSettings } from "@/app/haldus/homepage-actions";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

interface HeroConfig {
  versionName: string;
  eyebrow: string;
  heading: string;
<<<<<<< HEAD
  headingSize: string;
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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

const defaultHero: HeroConfig = {
  versionName: "",
  eyebrow: "",
<<<<<<< HEAD
  heading: "Tänapäev",
  headingSize: "clamp(56px,6vw,71px)",
  subtext: "",
=======
  heading: "Raamatud, mis kutsuvad edasi lugema.",
  subtext: "Suur valik ilukirjandust, lasteraamatuid, ajaloo- ja praktilisi teoseid.",
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  ctaLabel: "",
  ctaHref: "",
  secondaryLabel: "",
  secondaryHref: "",
  desktopImage: "",
  mobileImage: "",
  bgClass: "bg-[#f2eee6]",
<<<<<<< HEAD
  showSearch: false,
=======
  showSearch: true,
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  isPublished: false,
};

export default function HomepageAdminPage() {
  const [tab, setTab] = useState<"hero" | "cards" | "sections">("hero");
  const [loaded, setLoaded] = useState(false);

  const [hero, setHero] = useState<HeroConfig>(defaultHero);
  const [state, action, pending] = useActionState(saveHeroSettings, undefined);

  const [cards, setCards] = useState<HeroCard[]>([
<<<<<<< HEAD
    { id: "1", label: "Ajalugu", heading: "Eesti ajaloo suurteosed", description: "Avasta meie ajalooraamatute kollektsiooni.", linkHref: "/raamatud?category=ajalugu-ja-poliitika", desktopImage: "", mobileImage: "", position: 1 },
    { id: "2", label: "Lastele", heading: "Lasteraamatud igas vanuses", description: "Põnevad lood ja kaunid illustratsioonid.", linkHref: "/raamatud?category=lasteraamatud", desktopImage: "", mobileImage: "", position: 2 },
    { id: "3", label: "Hobi", heading: "Hobiaiandus ja käsitöö", description: "Praktilised nõuanded ja inspiratsioon.", linkHref: "/raamatud?category=hobid", desktopImage: "", mobileImage: "", position: 3 },
=======
    { id: "1", label: "Ajalugu", heading: "Eesti ajaloo suurteosed", description: "Avasta meie ajalooraamatute kollektsiooni.", linkHref: "/raamatud?category=ajalugu", desktopImage: "", mobileImage: "", position: 1 },
    { id: "2", label: "Lastele", heading: "Lasteraamatud igas vanuses", description: "Põnevad lood ja kaunid illustratsioonid.", linkHref: "/raamatud?category=laste-ja-noorteraamatud", desktopImage: "", mobileImage: "", position: 2 },
    { id: "3", label: "Hobi", heading: "Hobiaiandus ja käsitöö", description: "Praktilised nõuanded ja inspiratsioon.", linkHref: "/raamatud?category=kasiraamatud", desktopImage: "", mobileImage: "", position: 3 },
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  ]);

  const [sections, setSections] = useState<Section[]>([
    { id: "1", heading: "Uued raamatud", source: "newest", productCount: 8, viewAllHref: "/raamatud", isVisible: true },
<<<<<<< HEAD
    { id: "2", heading: "Ilmumas", source: "upcoming", productCount: 4, viewAllHref: "/raamatud?upcoming=true", isVisible: true },
    { id: "3", heading: "Soodus", source: "sale", productCount: 4, viewAllHref: "/pakkumised", isVisible: true },
  ]);

  const [cardsSaveMsg, setCardsSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sectionsSaveMsg, setSectionsSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cardsBusy, setCardsBusy] = useState(false);
  const [sectionsBusy, setSectionsBusy] = useState(false);

  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const [desktopPreview, setDesktopPreview] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");

  async function handleImageUpload(file: File, field: "desktopImage" | "mobileImage") {
    setUploadBusy(field);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("section", field === "desktopImage" ? "hero-desktop" : "hero-mobile");
    try {
      const res = await fetch("/api/admin/homepage-media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setUploadError(json.error ?? "Üleslaadimine ebaõnnestus");
      } else if (json.url) {
        updateHeroField(field, json.url);
        if (field === "desktopImage") setDesktopPreview(json.url);
        else setMobilePreview(json.url);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Üleslaadimine ebaõnnestus");
    } finally {
      setUploadBusy(null);
    }
  }

  async function handleCardImageUpload(file: File, cardId: string, field: "desktopImage" | "mobileImage") {
    setUploadBusy(`${cardId}-${field}`);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("section", `hero-card-${cardId}`);
    try {
      const res = await fetch("/api/admin/homepage-media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        setUploadError(json.error ?? "Üleslaadimine ebaõnnestus");
      } else if (json.url) {
        updateCard(cardId, field, json.url);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Üleslaadimine ebaõnnestus");
    } finally {
      setUploadBusy(null);
    }
  }

=======
    { id: "2", heading: "Ilmumas", source: "upcoming", productCount: 4, viewAllHref: "/raamatud", isVisible: true },
    { id: "3", heading: "Pakkumised", source: "sale", productCount: 4, viewAllHref: "/pakkumised", isVisible: true },
  ]);

>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  useEffect(() => {
    getHomepageSettings().then((data) => {
      if (data.hero) {
        setHero((prev) => ({ ...prev, ...data.hero }));
      }
<<<<<<< HEAD
      if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
        setCards(data.cards as unknown as HeroCard[]);
      }
      if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        setSections(data.sections as unknown as Section[]);
      }
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      setLoaded(true);
    });
  }, []);

<<<<<<< HEAD
  const isPublished = hero.isPublished || state?.success;
=======
  useEffect(() => {
    if (state?.success) {
      setHero((prev) => ({ ...prev, isPublished: true }));
    }
  }, [state]);
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

  function updateHeroField(field: keyof HeroConfig, value: string | boolean) {
    setHero((prev) => ({ ...prev, [field]: value }));
  }

  function updateCard(id: string, field: keyof HeroCard, value: string | number) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function updateSection(id: string, field: keyof Section, value: string | number | boolean) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

<<<<<<< HEAD
  function addCard() {
    const maxPos = cards.reduce((m, c) => Math.max(m, c.position), 0);
    const newCard: HeroCard = {
      id: String(Date.now()),
      label: "",
      heading: "",
      description: "",
      linkHref: "",
      desktopImage: "",
      mobileImage: "",
      position: maxPos + 1,
    };
    setCards((prev) => [...prev, newCard]);
  }

  function addSection() {
    const newSection: Section = {
      id: String(Date.now()),
      heading: "",
      source: "newest",
      productCount: 4,
      viewAllHref: "",
      isVisible: true,
    };
    setSections((prev) => [...prev, newSection]);
  }

  async function handleSaveCards() {
    setCardsBusy(true);
    setCardsSaveMsg(null);
    try {
      const result = await saveCardsSettings(cards);
      if (result?.error) {
        setCardsSaveMsg({ type: "error", text: result.error });
      } else {
        setCardsSaveMsg({ type: "success", text: "Kaardid salvestatud!" });
      }
    } catch (err) {
      setCardsSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Salvestamine ebaõnnestus" });
    } finally {
      setCardsBusy(false);
    }
  }

  async function handleSaveSections() {
    setSectionsBusy(true);
    setSectionsSaveMsg(null);
    try {
      const result = await saveSectionsSettings(sections);
      if (result?.error) {
        setSectionsSaveMsg({ type: "error", text: result.error });
      } else {
        setSectionsSaveMsg({ type: "success", text: "Sektsioonid salvestatud!" });
      }
    } catch (err) {
      setSectionsSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Salvestamine ebaõnnestus" });
    } finally {
      setSectionsBusy(false);
    }
  }

=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  return (
    <>
      <AdminPageHeader
        title="Avalehe haldus"
<<<<<<< HEAD
        description="Päise ala, esiletõstetud kaartide ja kodulehe sektsioonide redigeerimine."
        breadcrumbs={[{ label: "Ülevaade", href: "/haldus" }, { label: "Avaleht" }]}
=======
        description="Päise ala, esilet\u00f5stetud kaartide ja kodulehe sektsioonide redigeerimine."
        breadcrumbs={[{ label: "\u00dclevaade", href: "/haldus" }, { label: "Avaleht" }]}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      />

      <div className="flex border-b border-line mb-6">
        {(["hero", "cards", "sections"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
<<<<<<< HEAD
            {t === "hero" ? "Päise haldus" : t === "cards" ? "Esiletõstetud kaardid" : "Sektsioonid"}
=======
            {t === "hero" ? "Päise haldus" : t === "cards" ? "Esilet\u00f5stetud kaardid" : "Sektsioonid"}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          </button>
        ))}
      </div>

      {/* Päise editor */}
      {tab === "hero" && (
        <div className="max-w-3xl grid gap-5">
          <div className="flex items-center gap-3 mb-2">
<<<<<<< HEAD
            <StatusBadge variant={isPublished ? "published" : "draft"} />
            <span className="text-sm text-muted">{!loaded ? "Laen…" : isPublished ? "Avaldatud" : "Mustand"}</span>
=======
            <StatusBadge variant={hero.isPublished ? "published" : "draft"} />
            <span className="text-sm text-muted">{!loaded ? "Laen\u2026" : hero.isPublished ? "Avaldatud" : "Mustand"}</span>
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          </div>

          <FormField label="Versiooni nimi">
            <input name="versionName" value={hero.versionName} onChange={(e) => updateHeroField("versionName", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Suvine kampaania 2026" />
          </FormField>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <FormField label="Eelpealkiri (eyebrow)">
              <input name="eyebrow" value={hero.eyebrow} onChange={(e) => updateHeroField("eyebrow", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Uus kataloog" />
            </FormField>
            <FormField label="Pealkiri">
              <input name="heading" value={hero.heading} onChange={(e) => updateHeroField("heading", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Peamine pealkiri" />
            </FormField>
          </div>

<<<<<<< HEAD
          <FormField label="Pealkirja suurus (CSS)">
            <input name="headingSize" value={hero.headingSize} onChange={(e) => updateHeroField("headingSize", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="clamp(56px,6vw,71px)" />
          </FormField>

=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          <FormField label="Alatekst">
            <textarea name="subtext" value={hero.subtext} onChange={(e) => updateHeroField("subtext", e.target.value)} rows={3} className="border border-line bg-paper p-3 text-sm font-normal" />
          </FormField>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <FormField label="Peamine nupp (silt)">
              <input name="ctaLabel" value={hero.ctaLabel} onChange={(e) => updateHeroField("ctaLabel", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="Nt: Vaata kataloogi" />
            </FormField>
            <FormField label="Peamine nupp (URL)">
              <input name="ctaHref" value={hero.ctaHref} onChange={(e) => updateHeroField("ctaHref", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" placeholder="/raamatud" />
            </FormField>
            <FormField label="Teisene nupp (silt)">
              <input name="secondaryLabel" value={hero.secondaryLabel} onChange={(e) => updateHeroField("secondaryLabel", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
            <FormField label="Teisene nupp (URL)">
              <input name="secondaryHref" value={hero.secondaryHref} onChange={(e) => updateHeroField("secondaryHref", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
<<<<<<< HEAD
            <div className="grid gap-2">
              <FormField label="Lauaarvuti pilt">
                <input
                  ref={desktopRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.avif,.tif,.tiff"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "desktopImage"); }}
                  className="border border-line bg-paper p-3 text-sm font-normal"
                />
              </FormField>
              {(desktopPreview || hero.desktopImage) && (
                <div className="relative aspect-video bg-soft border border-line overflow-hidden">
                  <img src={desktopPreview || hero.desktopImage} alt="Laaditud pilt" className="w-full h-full object-contain" />
                </div>
              )}
              {uploadBusy === "desktopImage" && <p className="text-xs text-muted">Laadin üles…</p>}
            </div>
            <div className="grid gap-2">
              <FormField label="Mobiili pilt">
                <input
                  ref={mobileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.avif,.tif,.tiff"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "mobileImage"); }}
                  className="border border-line bg-paper p-3 text-sm font-normal"
                />
              </FormField>
              {(mobilePreview || hero.mobileImage) && (
                <div className="relative aspect-[9/16] max-w-[200px] bg-soft border border-line overflow-hidden">
                  <img src={mobilePreview || hero.mobileImage} alt="Laaditud pilt" className="w-full h-full object-contain" />
                </div>
              )}
              {uploadBusy === "mobileImage" && <p className="text-xs text-muted">Laadin üles…</p>}
            </div>
=======
            <FormField label="Lauaarvuti pilt (failinimi)">
              <input name="desktopImage" value={hero.desktopImage} onChange={(e) => updateHeroField("desktopImage", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
            <FormField label="Mobiili pilt (failinimi)">
              <input name="mobileImage" value={hero.mobileImage} onChange={(e) => updateHeroField("mobileImage", e.target.value)} className="border border-line bg-paper p-3 text-sm font-normal" />
            </FormField>
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          </div>

          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={hero.showSearch} onChange={(e) => updateHeroField("showSearch", e.target.checked)} className="accent-ink h-4 w-4" />
            Näita otsingukasti
          </label>

<<<<<<< HEAD
          {uploadError && <p className="text-accent text-sm font-bold">{uploadError}</p>}
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          {state?.error && <p className="text-accent text-sm font-bold">{state.error}</p>}
          {state?.success && <p className="text-leaf text-sm font-bold">Päise salvestatud!</p>}

          <form action={action} className="grid gap-5">
            <input type="hidden" name="versionName" value={hero.versionName} />
            <input type="hidden" name="eyebrow" value={hero.eyebrow} />
            <input type="hidden" name="heading" value={hero.heading} />
<<<<<<< HEAD
            <input type="hidden" name="headingSize" value={hero.headingSize} />
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
            <input type="hidden" name="subtext" value={hero.subtext} />
            <input type="hidden" name="ctaLabel" value={hero.ctaLabel} />
            <input type="hidden" name="ctaHref" value={hero.ctaHref} />
            <input type="hidden" name="secondaryLabel" value={hero.secondaryLabel} />
            <input type="hidden" name="secondaryHref" value={hero.secondaryHref} />
            <input type="hidden" name="desktopImage" value={hero.desktopImage} />
            <input type="hidden" name="mobileImage" value={hero.mobileImage} />
            <input type="hidden" name="bgClass" value={hero.bgClass} />
            <input type="hidden" name="showSearch" value={String(hero.showSearch)} />
            <input type="hidden" name="isPublished" value="true" />
<<<<<<< HEAD
            <button type="submit" disabled={pending} className="justify-self-start min-h-12 px-8 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">
              {pending ? "Salvestan…" : "Salvesta päise seaded"}
=======
            <button type="submit" disabled={pending} className="justify-self-start min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50">
              {pending ? "Salvestan\u2026" : "Salvesta p\u00e4ise seaded"}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
            </button>
          </form>
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
<<<<<<< HEAD
                <div className="grid gap-1">
                  <FormField label="Lauaarvuti pilt">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.avif,.tif,.tiff"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCardImageUpload(f, card.id, "desktopImage"); }}
                      className="border border-line bg-paper p-2 text-sm font-normal"
                    />
                  </FormField>
                  {card.desktopImage && (
                    <img src={card.desktopImage} alt="" className="w-full h-16 object-contain bg-soft border border-line" />
                  )}
                  {uploadBusy === `${card.id}-desktopImage` && <p className="text-xs text-muted">Laadin üles…</p>}
                </div>
                <div className="grid gap-1">
                  <FormField label="Mobiili pilt">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.avif,.tif,.tiff"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCardImageUpload(f, card.id, "mobileImage"); }}
                      className="border border-line bg-paper p-2 text-sm font-normal"
                    />
                  </FormField>
                  {card.mobileImage && (
                    <img src={card.mobileImage} alt="" className="w-full h-16 object-contain bg-soft border border-line" />
                  )}
                  {uploadBusy === `${card.id}-mobileImage` && <p className="text-xs text-muted">Laadin üles…</p>}
                </div>
              </div>
            </div>
          ))}
          <button onClick={addCard} className="justify-self-start min-h-10 px-6 border border-line font-bold text-sm hover:bg-soft">
            + Lisa kaart
          </button>
          {cardsSaveMsg && (
            <p className={`text-sm font-bold ${cardsSaveMsg.type === "error" ? "text-accent" : "text-leaf"}`}>{cardsSaveMsg.text}</p>
          )}
          <button onClick={handleSaveCards} disabled={cardsBusy} className="justify-self-start min-h-12 px-8 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">
            {cardsBusy ? "Salvestan…" : "Salvesta kaardid"}
=======
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
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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
<<<<<<< HEAD
                  Nähtav
=======
                  N\u00e4htav
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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
<<<<<<< HEAD
                    <option value="manual">Käsitsi valitud</option>
=======
                    <option value="manual">K\u00e4sitsi valitud</option>
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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
<<<<<<< HEAD
          <button onClick={addSection} className="justify-self-start min-h-10 px-6 border border-line font-bold text-sm hover:bg-soft">
            + Lisa sektsioon
          </button>
          {sectionsSaveMsg && (
            <p className={`text-sm font-bold ${sectionsSaveMsg.type === "error" ? "text-accent" : "text-leaf"}`}>{sectionsSaveMsg.text}</p>
          )}
          <button onClick={handleSaveSections} disabled={sectionsBusy} className="justify-self-start min-h-12 px-8 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">
            {sectionsBusy ? "Salvestan…" : "Salvesta sektsioonid"}
=======
          <button className="justify-self-start min-h-10 px-6 border border-line font-bold text-sm hover:bg-soft">
            + Lisa sektsioon
          </button>
          <button className="justify-self-start min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80">
            Salvesta sektsioonid
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          </button>
        </div>
      )}
    </>
  );
}
