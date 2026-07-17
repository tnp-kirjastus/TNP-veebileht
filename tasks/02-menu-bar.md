# Task 2: Globaalne Menüüriba Logo All

## Kirjeldus
Logo riba alla uus globaalne menüüriba:
UUDISED – UUED RAAMATUD – RAAMATUD – SARJAD – AUTORID – SOODUS – KIRJASTUS

## Failid

### 1. `src/lib/navigation.ts`
Uuenda `PUBLIC_NAV_ITEMS`:

```ts
export const PUBLIC_NAV_ITEMS = [
  { key: "uudised",       label: "Uudised",          href: "/uudised" },
  { key: "uued_raamatud", label: "Uued raamatud",    href: "/raamatud?sort=newest" },
  { key: "raamatud",      label: "Raamatud",          href: "/raamatud" },
  { key: "sarjad",        label: "Sarjad",            href: "/sarjad" },
  { key: "autorid",       label: "Autorid",           href: "/autorid" },
  { key: "pakkumised",    label: "Soodus",            href: "/pakkumised" },
  { key: "kirjastus",     label: "Kirjastus",         href: "/kirjastus" },
] as const;
```

**Muudatused võrreldes vanaga:**
- `"Uued raamatud"` — href muutub `/#uued` → `/raamatud?sort=newest` (või `/raamatud?upcoming=true` kui mõeldud on ilmuvad raamatud)
- Lisa `{ key: "autorid", label: "Autorid", href: "/autorid" }`
- `"Pakkumised"` → `"Soodus"` (label, URL jääb `/pakkumised`)
- Eemalda `{ key: "arhiiv", label: "Läbimüüdud", href: "/arhiiv" }` — arhiiv jääb ainult tootepuusse

Uuenda `isPublicNavActive`:
```ts
export function isPublicNavActive(key: ..., href: string, pathname: string) {
  if (key === "uudised" && pathname.startsWith("/uudis/")) return true;
  if (key === "raamatud" && pathname.startsWith("/raamat/")) return true;
  if (key === "autorid" && (pathname.startsWith("/autor") || pathname.startsWith("/raamatud?author="))) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

### 2. `src/lib/translations.ts`
Uuenda `nav` objekt:
```ts
nav: {
  uudised: "Uudised",
  uued_raamatud: "Uued raamatud",
  raamatud: "Raamatud",
  sarjad: "Sarjad",
  autorid: "Autorid",
  soodus: "Soodus",
  kirjastus: "Kirjastus",
},
```

### 3. `src/components/layout/Header.tsx`
Uus layout kahe reaga:
```
Rida 1 (sticky): [Logo] [otsinguriba] [FB] [IG] [Konto] [Ostukorv]
Rida 2 (sticky): [UUDISED] [UUED RAAMATUD] [RAAMATUD] [SARJAD] [AUTORID] [SOODUS] [KIRJASTUS]
```

Rida 2 — eraldi `<nav>` element, täislaiuses, border-bottom:
```tsx
<nav className="flex justify-center gap-[22px] border-t border-ink/[.06] max-[1120px]:hidden">
  {PUBLIC_NAV_ITEMS.map((item) => {
    const active = isPublicNavActive(item.key, item.href, pathname);
    return (
      <Link key={item.key} href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative uppercase font-extrabold text-sm py-3 whitespace-nowrap
          after:absolute after:left-0 after:right-0 after:bottom-[7px] after:h-[2px] after:bg-accent
          after:scale-x-0 after:origin-right after:transition-transform after:duration-[280ms]
          hover:after:scale-x-100 hover:after:origin-left ${active ? "text-accent after:scale-x-100" : "text-[#303437]"}`}>
        {item.label}
      </Link>
    );
  })}
</nav>
```

### 4. `src/components/layout/MobileNav.tsx`
Uuenda vastavalt — lisa "Autorid" ja "Soodus", eemalda "Läbimüüdud".

### 5. `src/lib/translations.ts` — `campaigns` objekt
```ts
campaigns: {
  title: "Soodus",
  description: "Soodsad raamatud piiratud aja jooksul. Kõik allahinnatud tooted ühes kohas.",
},
```

## Vastuvõtukriteeriumid
- [ ] Menüüriba on logo all, eraldi real
- [ ] Menüüriba sisaldab: UUDISED, UUED RAAMATUD, RAAMATUD, SARJAD, AUTORID, SOODUS, KIRJASTUS
- [ ] Menüüriba on sticky (kerib koos headeriga)
- [ ] "Pakkumised" asemel on "Soodus"
- [ ] "Läbimüüdud" on menüüst eemaldatud
- [ ] "Autorid" viib `/autorid` lehele
- [ ] Aktiivne menüüpunkt on punasega (accent) märgitud
- [ ] Menüüriba on nähtav kõikidel lehtedel
- [ ] Mobiilivaates menüü avaneb hamburgeri kaudu
