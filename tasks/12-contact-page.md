# Task 12: Kontakt Lehe Uuendused (Jaemüüjad)

## Kirjeldus
Uuenda jaemüüjate nimekirja kirjastuse lehel.

## Fail

### `src/app/[locale]/kirjastus/page.tsx`

Asenda `retailers` massiiv (hetkel read 18-22):

```tsx
const retailers = [
  {
    name: "Rahva Raamat",
    href: "https://www.rahvaraamat.ee",
    et: "Telliskivi 60/2 (I-hoone), 15073 Tallinn",
    en: "Telliskivi 60/2 (I-building), 15073 Tallinn",
  },
  {
    name: "Apollo Raamatud",
    href: "https://www.apollo.ee",
    et: "Tartu mnt 80d, 10112 Tallinn",
    en: "Tartu mnt 80d, 10112 Tallinn",
  },
  {
    name: "Raamatukoi",
    href: "https://www.raamatukoi.ee",
    et: "Harju 1, 10146 Tallinn",
    en: "Harju 1, 10146 Tallinn",
  },
];
```

**Võrdlus vanaga:**
- Vana: Rahva Raamat (Peterburi tee 92E), Apollo Raamatud (Põikmäe 2), Raamatukodu (T1 Mall)
- Uus: Rahva Raamat (Telliskivi 60/2), Apollo Raamatud (Tartu mnt 80d), Raamatukoi (Harju 1)

### Kontakt leht — `src/app/[locale]/kontakt/page.tsx`

Kontrolli, et email on `tnp@tnp.ee` ja telefon `+372 669 1890` (juba on, read 19-20).

### Email `tnp@tnp.ee` kogu süsteemis

Otsi `info@tanapaev.ee` ja asenda `tnp@tnp.ee`:

```
rg "info@tanapaev\.ee" --files-with-matches
```

Tõenäoliselt:
- `src/components/layout/Footer.tsx` — juba muudetud Task 3
- Võimalikke teisi faile — asenda

Otsi kõik ja asenda:
```
rg "info@tanapaev" -l
```

## Vastuvõtukriteeriumid
- [ ] Kirjastuse lehel on jaemüüjad: Rahva Raamat (Telliskivi 60/2), Apollo Raamatud (Tartu mnt 80d), Raamatukoi (Harju 1)
- [ ] Vana info (Raamatukodu, Peterburi tee, Põikmäe) on eemaldatud
- [ ] Kõik emailid kogu süsteemis on tnp@tnp.ee
