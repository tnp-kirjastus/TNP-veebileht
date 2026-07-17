# Task 1: Eemalda NoticeBar + Ehita Ümber Header

## Kirjeldus
- Eemalda "Tasuta tarne alates 40 eurost" ja "Uued raamatud, ettetellimused ja kampaaniad ühest kohast" riba
- Headeris logo kõrvale pikk otsinguriba
- Otsinguriba kõrvale FB ikoon, Insta ikoon, konto ikoon, ostukorvi ikoon
- Eemalda luubi ikoon (eraldi search button)

## Failid

### 1. `src/components/layout/NoticeBarClient.tsx`
Eemalda selle faili sisu — asenda tühja komponendiga või eemalda import kõikidest layout failidest.

```tsx
// Asenda kogu faili sisu lihtsalt tühja fragmendiga:
export function NoticeBar() {
  return null;
}
```

### 2. `src/components/layout/Header.tsx` — Ehita täielikult ümber

Uus struktuur:
```
Rida 1: [Logo 174px] [_____pikk otsinguriba_____] [FB] [IG] [Konto] [Ostukorv]
```

- **Logo** — jääb samaks (read 37-39)
- **Otsinguriba** — uus `<form>` element, mis submitib GET `/raamatud?q=...`
  - `<input type="search" placeholder="Otsi raamatut, autorit, ISBNi, kategooriat ..." />`
  - Pikk, flex-grow, terve rea keskel
  - Ctrl+K fokusseerib selle inputi (asenda senine search overlay avamine)
- **FB ikoon** — jääb samaks (read 58-62)
- **Insta ikoon** — jääb samaks (read 63-67)
- **Konto ikoon** — UUS! Mingi user/circle ikoon, link `/profiil` või login flow
  ```tsx
  <Link href="/profiil" className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center"
    aria-label="Konto">
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
    </svg>
  </Link>
  ```
- **Ostukorvi ikoon** — jääb samaks (read 79-88)
- **Eemalda**:
  - Search button (read 74-77)
  - Mobiilimenüü nupp (read 69-72) — VIIMASED read võib asendada hamburger menüüga mis avaneb ainult alla 1120px
  - LanguageToggle — võib jätta või liigutada

### 3. `src/lib/translations.ts`
Eemalda `notice` objekt:
```ts
// Eemalda:
notice: {
  free_shipping: "Tasuta tarne alates 40 eurost",
  tagline: "Uued raamatud, ettetellimused ja kampaaniad ühest kohast",
},
```

### 4. Layout failid — eemalda NoticeBar import
- `src/components/layout/LayoutFull.tsx`
- `src/components/layout/LayoutContained.tsx`
- `src/components/layout/LayoutSidebar.tsx`

Otsi ja eemalda:
```tsx
import { NoticeBar } from "@/components/layout/NoticeBarClient";
// ja
<NoticeBar />
```

### 5. `src/components/store/SearchOverlay.tsx`
Arhiveeri või jäta alles, aga eemalda import ja kasutus Headerist (search overlay ei ole enam vajalik, kuna otsing on otse headeris).

### 6. `src/components/layout/Shell.tsx`
Kontrolli, et Shell komponent toetab uut headeri struktuuri (grid, flexbox jne).

## Vastuvõtukriteeriumid
- [ ] Mustal taustal NoticeBar riba on täielikult kadunud
- [ ] Logo + pikk otsinguriba + FB + IG + konto + ostukorv on ühel real
- [ ] Otsinguriba placeholder on "Otsi raamatut, autorit, ISBNi, kategooriat ..."
- [ ] Luubi ikooni eraldi nuppu ei ole
- [ ] Ctrl+K fokusseerib otsinguriba
- [ ] Mobiilivaates (alla 760px) layout on korrektne
- [ ] FB ja IG ikoonid töötavad (lingivad õigetele lehtedele)
