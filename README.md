# Tänapäeva veebipood (tnp-store)

Kirjastus Tänapäev e-pood. **Kõik andmed elavad Supabase'i andmebaasis** ja kogu
sisu haldamine käib admin-liidese kaudu (`/haldus`) — muudatused on lehel kohe
näha, ilma deploy'ta.

## Stack

- **Next.js 16** (App Router, React 19), Tailwind 4
- **Supabase** (Postgres) — kataloog, tellimused, CMS, seaded
- **Maksekeskus** — maksed (HMAC-allkirjastatud, webhook + return)
- **Smaily** — uudiskiri; **Resend/SMTP** — tellimuskirjad

## Arhitektuur lühidalt

| Kiht | Asukoht | Märkus |
|---|---|---|
| Kataloogi lugemine | `src/lib/db/catalog.ts` | AINUS koht — view `commerce.v_products` + RPC `search_products` |
| DB tüübid | `src/lib/supabase/database.types.ts` | genereeritud: `npm run db:types` |
| Seaded (tarne, KM, e-post) | `content.settings` + `src/lib/settings.ts` | ainus tõde, adminis hallatav |
| Kupongid | `commerce.coupons` | adminis hallatav (`/haldus/seaded`) |
| Checkout | RPC `commerce.checkout_cart` | kogu tellimuse loogika ühes transaktsioonis |
| Import | `/haldus/import` | XLSX/CSV + ZIP kaanepiltidega (failinimed = ISBN) |

Cache-invalidation koodi pole: lehed renderdatakse dünaamiliselt ja loevad
otse andmebaasist, seega admini muudatused peegelduvad kohe.

## Arendus

```bash
npm run dev        # dev server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest (unit)
npm run db:types   # DB tüüpide uuendamine Supabase'ist
npx playwright test # e2e (vajab käivitavat dev serverit, käivitab ise)
```

Windows / TLS: kõik skriptid kasutavad `NODE_OPTIONS=--use-system-ca`.

## Andmebaasi migratsioonid

Migratsioonid on `supabase/migrations/NNN_*.sql` ja rakendatakse käsitsi
Supabase'i SQL editori kaudu (DDL-juurdepääs pole rakenduse võtmetes).
Järjekord on numbriline. Pärast rakendamist käivita `npm run db:types`.

## e2e testid (Playwright)

`e2e/` katab: kataloog DB-st, otsing, JSON-LD, admin→live peegeldus ilma
deploy'ta, seadete kohene jõustumine, admini UI suitsutest, a11y-skannid.
Eelduseks on rakendatud migratsioonid (viimased: 034, 035, 036).

## Administraatorile

- **Tooted**: `/haldus/tooted` — CRUD, laoseis, soodushinnad, kaanepildid
- **Import**: `/haldus/import` — Excel + ZIP; eelvaade enne rakendamist
- **Kampaaniad**: `/haldus/kampaaniad`; **Kupongid**: `/haldus/seaded`
- **Avalehe sisu**: `/haldus/avaleht`; **Lehed/uudised**: `/haldus`

Maksekeskuse sandbox: [docs/maksekeskus-sandbox.md](docs/maksekeskus-sandbox.md).
