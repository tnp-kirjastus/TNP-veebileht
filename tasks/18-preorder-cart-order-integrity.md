# Task 18: Ettetellimise ostukorvi ja orderi terviklikkus

## Kirjeldus
Ettetellimise UI on lisatud, kuid serveri ostukorvi ja checkout'i voog vajab üle kontrollimist. Risk on selles, et kliendi localStorage cart ja Supabase cart ei kanna samu preorder välju ning Supabase RPC võib stock-0 preorder toote tagasi lükata enne preorder erikäsitlust.

## Probleemid praeguses seisus

- `CheckoutTitle` otsustab teksti `Raamatu tellimine` kliendipoolse cart item'i `isUpcoming` ja `allowPreorder` väljade järgi.
- `src/lib/cart-server.ts` `readCart()` ei tagasta neid välju Supabase cart item'ites.
- Kui klient lisab toote ja cart sünkroniseerub serveriga, võib serverist tagasi loetud cart kaotada preorder metadata.
- Checkout API primary path kutsub `commerce.create_order_from_cart` RPC-d enne preorder kontrolli. RPC kontrollib stock'i ega tea `allow_preorder` erandist.

## Failid

### 1. `src/lib/cart-server.ts`

Lisa `readCart()` Supabase päringusse:

- `is_upcoming`
- `allow_preorder`

Tagasta DTO-s:

```ts
isUpcoming: product.is_upcoming,
allowPreorder: product.allow_preorder,
```

Uuenda `CartDtoItem` interface.

### 2. `src/lib/cart-context.tsx`

Veendu, et serverist loetud cart ei kustuta preorder välju. Kui server tagastab vanema DTO, ära lõhu localStorage andmeid ootamatult.

### 3. `src/app/api/checkout/route.ts`

Muuda preorder loogika serveris autoriteetseks:

- Enne `create_order_from_cart` RPC kutsumist kontrolli, kas kõik cart item'id on `is_upcoming && allow_preorder`.
- Kui kõik on preorder, ära kasuta stock-reserve RPC-d.
- Loo preorder order otse või tee eraldi DB funktsioon, mis ei nõua stock'i.
- Kui cart sisaldab nii preorder kui tavalisi raamatuid, määra selge ärireegel:
  - kas segakorv läheb tavaliseks makseks
  - või segakorv on keelatud ja UI/API palub tellimused eraldada

### 4. Supabase migration

Kui otsustad DB funktsiooni muuta, lisa uus migration. Ära muuda juba rakendatud migratione tagantjärele.

Võimalikud variandid:

- `024_preorder_order_flow.sql`
- või parandus `create_order_from_cart` funktsioonile, mis arvestab `is_upcoming && allow_preorder`

## Vastuvõtukriteeriumid

- [ ] Ainult ettetellitavate toodetega cart näitab checkoutis `Raamatu tellimine`.
- [ ] Ainult ettetellitavate toodetega tellimus ei ava Maksekeskuse makset.
- [ ] Stock `0` preorder toode ei kuku serveris `insufficient_stock` veaga läbi.
- [ ] Segakorvi käitumine on üheselt defineeritud ja UI/API käituvad samamoodi.
- [ ] Server ei usalda kliendi saadetud `isUpcoming` / `allowPreorder` välju, vaid kontrollib Supabase toodetest.
- [ ] `npm test` sisaldab preorder checkout'i happy path'i ja stock-0 preorder juhtumit.
