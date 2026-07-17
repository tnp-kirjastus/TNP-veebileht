# Task 19: Soodusprotsentide riba peab jääma menüü alla

## Kirjeldus
Word failis oli probleem, et soodusprotsendid liiguvad lehel alla kerides ülemise menüüriba peale. Praegune lahendus lisas `DiscountTicker` komponendi enne headerit, kuid kliendi uus täpsustus on: protsendid ei tohi scrollida menüüriba peal. Need peavad jääma menüüriba alla.

## Soovitud käitumine

Lehe ülaosa järjekord peab olema:

1. Header esimene rida: logo, otsing, social/account/cart
2. Header teine rida: globaalne menüü
3. Soodusprotsentide ticker menüü all
4. Lehe sisu

Kui header on sticky, siis ticker ei tohi visuaalselt katta ega üle joosta menüüribast.

## Failid

### 1. `src/components/layout/Header.tsx`

Kaalu `DiscountTicker` liigutamist headeri sisse pärast `<nav>` elementi, et stacking context ja sticky positsioon oleks ühes komponendis kontrollitav.

Alternatiiv: jäta eraldi komponendiks, aga renderi see layoutides pärast `Header` komponenti ja anna talle õige `z-index` / sticky offset.

### 2. `src/components/layout/DiscountTicker.tsx`

Kontrolli stiilid:

- Ticker ei tohi olla kõrgema `z-index` väärtusega kui header.
- Ticker ei tohi kasutada `position: fixed`, kui see katab menüüd.
- Kui ticker on sticky, peab `top` arvestama headeri kõrgusega.
- `overflow-hidden` peab kehtima ainult tickeri enda sees, mitte headeri peale.

### 3. Layout failid

Kontrolli kõik layoutid:

- `src/components/layout/LayoutFull.tsx`
- `src/components/layout/LayoutContained.tsx`
- `src/components/layout/LayoutSidebar.tsx`

Ära jäta erinevates layoutides tickerit erinevasse kohta.

## Testimine

Visuaalne kontroll on kohustuslik:

- Desktop: scrolli avalehel, raamatute lehel, sooduslehel.
- Mobile: kontrolli, et ticker ei kata hamburgeri menüüd ega sticky headerit.
- Kontrolli nii siis, kui tickeril on palju protsente, kui ka siis, kui soodustusi pole.

Kui kasutatakse Playwrighti, lisa vähemalt üks smoke test või screenshot check header/ticker kattumise vastu.

## Vastuvõtukriteeriumid

- [ ] Soodusprotsendid asuvad menüüriba all, mitte menüü peal.
- [ ] Scrollides ei kata ticker logo, otsingut, nav menüüd ega mobile hamburgerit.
- [ ] Kõigis layoutides on sama järjekord.
- [ ] Kui soodustooteid pole, ei teki tühja 38px riba.
- [ ] Desktop ja mobile vaated on visuaalselt üle kontrollitud.
- [ ] `npm run lint`, `npm test` ja typecheck jäävad roheliseks.
