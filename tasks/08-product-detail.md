# Task 8: Raamatu Kirje Täiendused

## Kirjeldus
- Kuupäev formaadis DD.MM.YYYY (mitte "02. juuli 2026")
- Kõik isikud (Autor, Tõlkija, Kujundaja, Illustreerija, Toimetaja) klikitavad
- Sarja nimi klikitav
- Kordustrükkide info säilitamine
- Eemaldada eraldi "Aasta" väli (kui on)
- Toote all vähemalt kaks teema riba: Samalt autorilt, Samast sarjast, Samast kategooriast

## Failid

### 1. `src/lib/product-utils.ts` — Kuupäeva formaat

```ts
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Eraldi funktsioon kordustrükkide jaoks:
export function formatEditions(editions: { type: string; date: string }[]): string {
  return editions
    .map(e => `${formatDate(e.date)} (${e.type})`)
    .join(", ");
}
```

### 2. `src/app/raamat/[slug]/page.tsx` — Tootelehe uuendused

#### 2a. Autorite klikitavus — juba on ✓ (read 114, 125-129)
Kontrolli, et autor on samuti `<Link>` elemendina (hetkel read 114 on juba okei).

#### 2b. Sarja link — juba on ✓ (rida 129)

#### 2c. Kuupäev uues formaadis (rida 123):
```tsx
{product.release_date && (
  <div>
    <dt className="...">Ilmumine</dt>
    <dd className="...">{formatDate(product.release_date)}</dd>
  </div>
)}
```

#### 2d. Kordustrükkide kuvamine:
Kui `product.editions` on olemas:
```tsx
{product.editions && product.editions.length > 1 && (
  <div>
    <dt className="...">Kordustrükid</dt>
    <dd className="...">{formatEditions(product.editions)}</dd>
  </div>
)}
```

#### 2e. Seotud toodete sektsioonid — juba on ✓ (read 136-164):
- "Sellest kategooriast" → "Samast kategooriast" (muuda pealkiri)
- "Veel autorilt X" → "Samalt autorilt" (juba olemas)
- "Veel sarjast X" → "Samast sarjast" (juba olemas)

Pealkirjad:
```tsx
// Rida 139:
<h2 className="font-heading text-[28px]">
  {product.categories[0] ? `Samast kategooriast` : "Sellest kategooriast"}
</h2>

// Rida 149:
<h2 className="font-heading text-[28px]">Samalt autorilt: {primaryAuthor}</h2>

// Rida 159:
<h2 className="font-heading text-[28px]">Samast sarjast: {product.series_name}</h2>
```

Toode all vähemalt kaks riba — juba olemas ✓ (author + series + category = 3 riba).

### 3. `src/lib/data-types.ts` — Lisa editions tugi

```ts
export interface Product {
  // ... olemasolevad
  editions?: { type: string; date: string }[];  // kordustrükkide info
  latest_release_date?: string;                  // viimase trüki kuupäev
}
```

### 4. Andmebaas — `supabase/migrations/022_product_editions.sql`

```sql
-- Lisa uus veerg kordustrükkide info jaoks
ALTER TABLE commerce.products
ADD COLUMN editions JSONB DEFAULT '[]';

COMMENT ON COLUMN commerce.products.editions IS
  'Kordustrükkide info: [{ "type": "2. trükk", "date": "2025-01-01" }, ...]';

-- Esmatrüki kuupäev jääb release_date veergu
-- latest_release_date on automaatselt editions massiivi viimase kirje kuupäev
```

### 5. Admin tootevorm — `src/app/haldus/(protected)/tooted/`

Lisa kordustrükkide haldamise UI toote vormi:
- Nupp "Lisa trükk"
- Väljad: trüki number/tüüp, kuupäev
- Kuvatakse olemasolevad trükid nimekirjana

### 6. `src/lib/translations.ts`

Lisa uued tõlkevõtmed:
```ts
product: {
  // ... olemasolevad
  editions: "Kordustrükid",
  same_category: "Samast kategooriast",
  same_author: "Samalt autorilt",
  same_series: "Samast sarjast",
},
```

## Vastuvõtukriteeriumid
- [ ] Kuupäevad on formaadis DD.MM.YYYY (nt "02.07.2026")
- [ ] Autor, Tõlkija, Kujundaja, Illustreerija, Toimetaja on klikitavad — viivad `/raamatud?author=slug` või `/raamatud?translator=slug` jne
- [ ] Sarja nimi on klikitav — viib `/sarjad/[slug]`
- [ ] Kordustrükkide info on näha, kui tootel on mitu trükki
- [ ] Eraldi "Aasta" välja enam ei ole
- [ ] Toote all on sektsioonid "Samast kategooriast", "Samalt autorilt", "Samast sarjast"
