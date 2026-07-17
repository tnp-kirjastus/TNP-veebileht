# Task 17: Teemalehtede breadcrumb ja kirjeldustekstide cleanup

## Kirjeldus
Word failis paluti mitmelt teemalehelt eemaldada ebavajalikud breadcrumbid, üldpealkirjad ja kirjeldustekstid. Praeguses seisus on need mitmel lehel endiselt alles.

## Lehed

### 1. `src/app/uudised/page.tsx`

Eemalda avalikust vaatest:

- `Esileht / Uudised` breadcrumb
- Üldine `Uudised` pealkirjaplokk, kui see jääb sisuliselt kordama menüüpunkti
- Kirjeldus `Käsikirjade võistlused, uudised ja tulemused kirjastuselt Tänapäev...`

Jäta alles uudiste nimekiri ja uudise kaardid.

Kontrolli eraldi, kas vanalt `tnp.ee` lehelt uudised on vaja importida. Kui importi ei tehta selles taskis, lisa TODO või eraldi migratsiooni task.

### 2. `src/app/raamatud/page.tsx`

Eemalda avalikust vaatest:

- `Esileht / Raamatud` breadcrumb
- Kirjeldus `Sirvi kogu valikut kategooriate, autoripäritolu ja pakkumiste järgi.`

Jäta alles funktsionaalne filtrite ja toodete vaade. Kui aktiivne filter/otsing vajab pealkirja, näita seda kompaktsemalt.

### 3. `src/app/sarjad/page.tsx`

Eemalda avalikust vaatest:

- `Esileht / Sarjad` breadcrumb
- Üldine kirjeldus `Kõik raamatusarjad on järjestatud...`

Leht peab jääma visuaalselt viimistletud, mitte lihtsalt tühjema hero-plokiga.

### 4. `src/app/pakkumised/page.tsx`

Eemalda avalikust vaatest:

- `Esileht / Soodus` breadcrumb
- Kirjeldus `Lehel kuvatakse kõik aktiivsed kampaaniad...`

Sõna `Soodus` jääb pealkirjana alles ainult siis, kui see on kujunduslikult vajalik.

### 5. `src/app/[locale]/kirjastus/page.tsx`

Eemalda avalikust vaatest:

- `Esileht / Kirjastus` breadcrumb
- Kirjeldus `Saame tuttavaks...`

Kirjastuse sisutekst tuleb lugeda kliendi poolt veel ülevaatamist vajavaks. Ära esita praegust teksti lõplikuna, kui klient ei ole selle kinnitanud.

## Vastuvõtukriteeriumid

- [ ] Word failis ebavajalikuks märgitud breadcrumbid ja kirjeldused on eemaldatud.
- [ ] Lehed ei jää visuaalselt poolikuks ega liiga suure tühja ülaosaga.
- [ ] SEO metadata võib jääda alles, kui see ei kuva neid tekste lehel.
- [ ] Uudiste importimise staatus on selgelt otsustatud või eraldi taskiks tõstetud.
- [ ] `npm run lint` ja `npm test` jäävad roheliseks.
