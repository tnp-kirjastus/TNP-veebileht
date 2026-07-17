# Task 4: Admin Encoding Fix — Sektsioonid "Nähtav"

## Kirjeldus
Admin paneelis `/haldus/avaleht` Sektsioonid tab-is on kiri "Nähtav" kuvatud Unicode escape'ina.

## Fail

### `src/app/haldus/(protected)/avaleht/page.tsx`

**Rida 434** — kontrolli ja paranda:

```tsx
// Otsi:
N\u00e4htav

// Asenda:
Nähtav
```

Kontekst:
```tsx
<label className="flex items-center gap-2 text-sm font-bold">
  <input type="checkbox" checked={section.isVisible} onChange={(e) => updateSection(section.id, "isVisible", e.target.checked)} className="accent-ink h-4 w-4" />
  Nähtav   {/* ← parandatud */}
</label>
```

## Vastuvõtukriteeriumid
- [ ] Admin lehel `/haldus/avaleht` → Sektsioonid → checkbox'i silt on "Nähtav" (mitte `N\u00e4htav`)
