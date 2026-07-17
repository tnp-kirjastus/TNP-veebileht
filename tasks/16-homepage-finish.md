# Task 16: Esilehe lõpetamine Word faili põhjal

## Kirjeldus
Esilehe parandused on osaliselt tehtud, kuid Word failis olnud kommentaaridest jäi mitu osa pooleli. Eriti tuleb eemaldada vana hero tekst/otsing fallbackina, parandada esiletõstetud kaartide lingid ja teha haldusest määratavad bännerilingid päriselt kasutusse.

## Probleemid praeguses seisus

- Kui CMS hero seadistus puudub, kuvatakse endiselt vana tekst `Suur valik ilukirjandust...`.
- Kui `showSearch` ei ole CMS-is `false`, jääb esilehele endiselt suur otsingukast, kuigi otsing viidi headerisse.
- `getHomepageCards()` on olemas, aga esileht kasutab endiselt hard-coded kolme kaarti.
- Kaartide hard-coded lingid kasutavad vigaseid kategooriaid:
  - `/raamatud?category=ajalugu` - sellist slug'i ei ole.
  - `/raamatud?category=laste-ja-noorteraamatud` - sellist slug'i ei ole.
- `heroMobileImage` loetakse, aga ei kasutata.

## Failid

### 1. `src/app/page.tsx`

Muuda esileht nii, et:

- Headeris olev otsing on ainus põhiotsing.
- Hero fallback ei too tagasi kliendi eemaldada palutud teksti.
- Kui CMS-is ei ole hero teksti, jäta alatekst tühjaks või kasuta kliendi poolt kinnitatud uut teksti.
- Kui CMS-is ei ole `showSearch`, vaikimisi ei kuvata esilehe hero otsingut.
- Esiletõstetud kaardid tulevad `getHomepageCards()` kaudu.
- Kui CMS kaarte ei ole, fallback-kaartide lingid kasutavad olemasolevaid kategooriaid:
  - `ajalugu-ja-poliitika`
  - `lasteraamatud` või `laste-ilukirjandus`
  - `hobid`
- Sisemised lingid kasuta `Link` komponendiga, mitte tavalise `<a>` elemendiga.

### 2. `src/lib/homepage.ts`

Kontrolli ja puhasta:

- Eemalda debug logid.
- `getHomepageCards()` peab tagastama kaardi `linkHref`, `desktopImage`, `mobileImage`, `label`, `heading`, `description`.
- Kui CMS andmetes on vigane link või pilt, peab UI katkise renderi asemel kasutama mõistlikku fallbacki.

### 3. `src/app/haldus/(protected)/avaleht/page.tsx`

Kontrolli, et halduses saab iga esiletõstetud kaardi jaoks määrata:

- Pealkiri
- Väike label
- Kirjeldus
- Link
- Desktop pilt
- Mobile pilt
- Järjekord

Kaardi link peab lubama mitte ainult toote URL-i, vaid ka:

- kampaania URL
- kategooria URL
- sarja URL
- uudise URL
- käsitsi sisestatud sisemine URL

## Vastuvõtukriteeriumid

- [ ] Esilehel ei ilmu vana tekst `Suur valik ilukirjandust...`, kui klient pole seda CMS-is tagasi lisanud.
- [ ] Esilehel ei ole suurt hero otsingukasti vaikimisi.
- [ ] Kolmikbännerid kasutavad CMS-is määratud linke.
- [ ] Kui CMS kaarte ei ole, fallback-lingid viivad päriselt tulemusi andvatele lehtedele.
- [ ] Kõik siselingid kasutavad `next/link`.
- [ ] Mobile pilt renderdub mobiilivaates või fallback on teadlikult dokumenteeritud.
- [ ] `npm run lint` ja `npm test` jäävad roheliseks.
