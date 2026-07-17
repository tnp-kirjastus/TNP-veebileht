# Task 10: Teemaleht SOODUS (endine PAKKUMISED)

## Kirjeldus
Muuda kõik "Pakkumised" viited sõnaks "Soodus" (ka tootepuus). URL võib jääda `/pakkumised`.

## Failid

### 1. `src/lib/translations.ts`

```ts
// Rida 108-110:
campaigns: {
  title: "Soodus",
  description: "Soodsad raamatud piiratud aja jooksul. Kõik allahinnatud tooted ühes kohas.",
},

// home object:
home: {
  // ...
  offers: "Soodus",
  all_offers: "Kõik soodsad raamatud",
},

// filters:
filters: {
  // ...
  sale: "Soodus",  // juba õige ✓
},
```

### 2. `src/app/pakkumised/page.tsx`

```tsx
export const metadata: Metadata = {
  title: "Soodus",
  description: "Kõik aktiivsed püsivad ja hooajalised raamatupakkumised."
};

// Lehel:
<h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Soodus</h1>
<p className="max-w-[620px] mt-4 text-muted">
  Lehel kuvatakse kõik aktiivsed kampaaniad — nii püsivad pakkumised kui hooajalised.
</p>

// Sektsiooni pealkirjad:
const title = persistent ? "Püsivalt soodsad" : /* ... */;
```

### 3. `src/lib/navigation.ts`

```ts
{ key: "pakkumised", label: "Soodus", href: "/pakkumised" },
```

### 4. Admin paneel — `src/app/haldus/(protected)/kampaaniad/page.tsx`

Kontrolli ja uuenda pealkirjad "Pakkumised" → "Soodus".

## Vastuvõtukriteeriumid
- [ ] Menüüs on "Soodus" (mitte "Pakkumised")
- [ ] Tootepuus on "Soodus" filter
- [ ] `/pakkumised` lehel on pealkiri "Soodus"
- [ ] Admin paneelis on "Soodus"
- [ ] Kõik kasutajale nähtavad "Pakkumised" tekstid on asendatud "Soodus"-ga
