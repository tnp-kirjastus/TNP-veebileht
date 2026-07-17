# Task 5: Tootepuu Ja Kategooriate Ümberehitus

## Kirjeldus
- Kategooriad peavad vastama nõutud struktuurile koos alamkategooriatega
- Vanemakategooria valik näitab kõiki alamkategooriate raamatuid
- Võimalus valida mitu kategooriat korraga (checkbox multi-select)
- "Näita kõiki" peab olema aktiivne ainult siis, kui MITTE ÜKSKI filter pole aktiivne

## Failid

### 1. Andmebaas / Seed — `supabase/seed.sql`

Seed fail on juba õige struktuuriga. Kontrolli et kõik oleks olemas:

```sql
-- Peamised kategooriad:
-- ajalugu-ja-poliitika, elulood-ja-memuaarid, ilukirjandus, lasteraamatud,
-- kultuur, loodus, keha-ja-hing, hobid, kinkeraamatud, arhiiv

-- Alamkategooriad:
-- Ilukirjandus: ajaviitekirjandus, kaasaegne-ilukirjandus, ponevus-ja-krimi,
--   ulme-ja-fantaasia, noortekirjandus, luule, huumor
-- Lasteraamatud: laste-ilukirjandus, laste-teatmekirjandus, lastekirjanduskeskus-soovitab
-- Kultuur: teatmeteosed, teater-muusika-film, kirjandus
-- Keha ja hing: psuhholoogia, suhted-ja-perekond, tervis
-- Hobid: kasitoo, sport, reisimine, lemmikloomad, varia
```

### 2. `src/components/store/FilterSidebar.tsx`

#### 2a. Multi-select kategooriad (checkbox)

Muuta `CategoryTreeGroup` ja `buildUrl` loogikat:
- URL parameetrites mitu kategooriat: `?category=ilukirjandus&category=luule`
- Checkbox stiilis valik (hetkel on radio-stiilis, ainult üks valik)

```tsx
function buildUrl(updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...currentParams };
  Object.entries(updates).forEach(([k, v]) => {
    if (v === undefined) {
      delete merged[k];
    } else {
      // Toeta mitut category parameetrit
      merged[k] = v;
    }
  });
  // Kustuta page parameeter
  // Ehita URL mitme category parameetriga
  return `/raamatud?${paramString}`;
}
```

#### 2b. Vanemakategooria → kõik alamad

Kui klikkida "Ilukirjandus", peaks filtreerima raamatud kõikidest alamkategooriatest:
`?category=ajaviitekirjandus&category=kaasaegne-ilukirjandus&category=ponevus-ja-krimi&category=ulme-ja-fantaasia&category=noortekirjandus&category=luule&category=huumor`

VÕI lihtsam: back-end loogika, kus `category=ilukirjandus` tagastab automaatselt kõik alamkategooriad.

#### 2c. "Näita kõiki" parandus

```tsx
function isQuickActive(f: (typeof QUICK_FILTERS)[number]) {
  if (f.key === "all") {
    // Aktiivne ainult kui mitte ükski filter pole aktiivne:
    return !currentParams.origin
      && !currentParams.sale
      && !currentParams.upcoming
      && !currentParams.category  // ← lisa see puuduv tingimus
      && !Object.keys(currentParams).some(k => k.startsWith("category"))
      && (!currentParams.sort || currentParams.sort === "newest");
  }
  return f.param ? currentParams[f.param] === f.value : false;
}
```

### 3. `src/app/raamatud/page.tsx`

Uuenda filtreerimisloogikat, et toetada mitut kategooriat:
```tsx
// Kui mitu category parameetrit, filtreeri OR tingimusega
if (categories.length > 0) {
  filtered = filtered.filter(p => p.categories.some(c => categories.includes(c)));
}
```

### 4. `src/lib/data.ts`

Lisa uus funktsioon tootmaks hierarhiline kategooriate puu ja filtreerimaks vanemakategooria alusel:

```ts
export function getProductsByCategories(categorySlugs: string[]): Product[] {
  const categoryNames = allCategories()
    .filter(c => categorySlugs.includes(c.slug))
    .map(c => c.name);
  return activeProducts().filter(p =>
    p.categories.some(c => categoryNames.includes(c))
  );
}

export function getChildCategories(parentSlug: string): Category[] {
  return allCategories().filter(c => {
    const parent = allCategories().find(pc => pc.slug === parentSlug);
    // Tagasta kõik alamkategooriad, mis kuuluvad parentSlug alla
    // See eeldab, et categories.json sisaldab parent/children struktuuri
  });
}
```

### 5. Andmete struktuur — `src/lib/data-types.ts`

Lisa Category tüübile children support:
```ts
export interface Category {
  name: string;
  slug: string;
  parent?: string;
  children?: Category[];
}
```

### 6. `src/data/categories.json` — uuenda genereerimisskripti

Fail `scripts/regenerate-json.mjs` — veendu, et kategooriad eksporditakse hierarhilise struktuuriga, sisaldades parent_id ja children.

## Vastuvõtukriteeriumid
- [ ] Tootepuu sisaldab kõiki nõutud kategooriaid ja alamkategooriaid
- [ ] Vanemakategooria (nt "Ilukirjandus") valides kuvatakse kõik alamkategooriate raamatud
- [ ] Alamkategooria (nt "luule") valides kuvatakse ainult selle alamkategooria raamatud
- [ ] Võimalik valida mitu kategooriat korraga (OR loogika)
- [ ] "Näita kõiki" on aktiivne ainult siis, kui ükski filter pole aktiivne
- [ ] Eesti autorid / Välismaa autorid valik töötab (peaks "Näita kõiki" deaktiveerima)
