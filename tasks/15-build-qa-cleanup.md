# Task 15: Build ja QA cleanup

## Kirjeldus
Praegune seis ei ole release-valmis, sest lint ja testid ei läbi. Enne kliendile üleandmist tuleb projekt viia tagasi rohelisse seisu ning eemaldada debug-jäljed.

## Leitud probleemid

- `npm run lint` ebaõnnestub 11 erroriga ja mitme warninguga.
- `npm test` ebaõnnestub, sest test ootab endiselt vana `courier` tarneviisi.
- Homepage andmelaaduris on debug `console.log`.
- Mõnes uues/puudutatud failis on lihtsad lint-vead (`prefer-const`, kasutamata muutujad, `<a>` siselingi asemel).

## Failid

### 1. `src/lib/payments/maksekeskus.test.ts`

Uuenda tarne testid vastavalt uuele ärireeglile:

- `courier` / `Kuller` ei ole enam lubatud tarneviis.
- Testid peavad kontrollima ainult `omniva` ja `smartpost` tarneid.
- Kui säilitada tundmatu tarne test, siis `calculateShippingCost("courier", 10)` peab tagastama `0` või test tuleb eemaldada, sest `courier` ei kuulu enam lubatud valikutesse.

### 2. `src/lib/homepage.ts`

Eemalda debug log:

```ts
console.log("getHomepageHero showSearch raw:", hero.showSearch, typeof hero.showSearch);
```

Alles võivad jääda päris vea logid (`console.error`) seal, kus need aitavad production diagnostikat.

### 3. Lint errorid

Paranda vähemalt kõik `npm run lint` errorid:

- `src/app/api/admin/homepage-media/route.ts` - `pipeline` peaks olema `const`.
- `src/app/haldus/import-actions.test.ts` - `dbSucceeded` peaks olema `const`.
- `src/app/haldus/import-actions.ts` - `mediaInfo` peaks olema `const`.
- `src/lib/media.ts` - `pipeline` peaks olema `const`.
- `src/app/page.tsx` - sisemine link `/raamat/90-rododendronit` peab kasutama `next/link`.
- `src/components/store/CartDrawerWrapper.tsx` ja `src/lib/cart-context.tsx` - lahenda React lint `set-state-in-effect` reegli järgi.
- `scripts/import-products.mjs` - kas muuda CommonJS `require` importideks või välista legacy script lintist, kui see ei ole aktiivne runtime osa.

### 4. Warningud

Kõik warningud ei pea kohe kaduma, kuid uute parandustega seotud warningud tuleb korrastada:

- Kasutamata importid/muutujad.
- `FilterSidebar` checkbox nupud: `aria-checked` ei sobi tavalisele `button` rollile. Kasuta päris `<input type="checkbox">` või lisa korrektne `role="checkbox"`.

## Vastuvõtukriteeriumid

- [ ] `npm run lint` lõpeb exit code `0`.
- [ ] `npm test` lõpeb exit code `0`.
- [ ] `npm run typecheck` või `tsc --noEmit --incremental false` lõpeb exit code `0`.
- [ ] Debug `console.log` on eemaldatud.
- [ ] Testid ei viita enam eemaldatud `courier` tarneviisile.
- [ ] Parandused ei muuda kliendi kinnitatud funktsionaalsust tagasi.
