# TNP veebipoe arendusraport

**Periood:** 02.07.2026 – 22.07.2026  
**Projekt:** TNP Kirjastuse veebipood (Next.js + Supabase + Vercel)

---

## 1. Esmane ehitus (02.07.2026)

- Loodi TNP veebipoe algversioon Next.js platvormil koos Omniva/Smartpost kulleriteenuse integ ratsiooni, Maksekeskuse makselahenduse ja Supabase admin-liidesega.
- Lisati Omniva ja Smartpost pakiautomaatide toe täiendused, Supabase impordiskriptid, admin-bypass ning duplikaatsete SKU-de parandused.
- Loodi Vercel deploy seadistus ja lisati `supabase temp` `.gitignore`-isse.
- Parandati `isomorphic-dompurify` ühilduvusprobleem Vercelil (jsdom ESM), asendati inline sanitizer'iga.

## 2. Kassa ja tellimuste kriitilised parandused (03.07.2026)

- Parandati ostukorvi topelt-sünkroniseerimine, tellimuste kogusummad, paid-cookie fallback, notifications_url.
- Lisati Eesti pakiautomaatide filter, saadetise registreerimine, vealogimine.
- Loodi ja läbis 39 maksetesti (Maksekeskus).
- Soodusmärgis viidi toote pildi konteinerist välja vastavalt mockup'ile.
- Täiendati admin-liidest ja tootevorme ning kassa funktsionaalsust.

## 3. Admin-ala vundament (03.07.2026)

- Loodi terviklik admin-ala: toodete CRUD, partii-redigeerimine, import Excelist/JSON-ist, taksonoomia haldus (kategooriad, sarjad, autorid).
- Kampaaniate haldus, blogi haldus, kliendihaldus, avalehe CMS (sektsioonide haldus koos toodete valikuga).
- Admin autentimine, rollipõhine ligipääs, RLS-poliitikad.

## 4. Ehituse parandused (03.07.2026)

- Parandati SyntaxError `regenerate-json.mjs` failis – TypeScript `as` väited eemaldati puhtast JS-failist.
- Parandati Turbopack build: ekstraktiti kliendiohutud utiliidid server-only `data.ts` failist eraldi moodulisse.

## 5. Turvaauditi parandused (15.07.2026)

- Parandati kõik auditi leiud: saladuste haldus, RLS-poliitikad, API päringute piiramine (rate limiting), N+1 päringute optimeerimine, veakäsitlus ja autentimine.

## 6. Admin-liidese täiendused (17.07.2026)

- Asendati Unicode pao-jadad (`\uXXXX`) eestikeelsete tähemärkidega kõigis admin/API/lib failides.
- Lisati vaiketarne-hinnad "Tarne" seadete sakki.
- Eemaldati ingliskeelse sildi väli tarne seadete vormilt.
- Tugevdati avalehe hero-sektsiooni seadeid ja lisati pealkirja suuruse slider.
- Parandati null-lubatavad tarne seaded produktsiooni ehituses.
- Lahendati merge-konfliktid.

## 7. Uued raamatud – kuvamise täpsustus (22.07.2026)

- Vähendati avalehe "Uued raamatud" sektsiooni raamatute vaikimisi arvu 10-lt 5-le (üks rida).

---

## 8. E-kirjade ja teavituste süsteem

### 8.1 E-posti saatmine (Resend)

Kõik ärilised e-kirjad saadetakse **Resend** platvormi kaudu. API võti loetakse `RESEND_API_KEY` keskkonnamuutujast; kui see puudub, jäetakse kõik e-kirjad vaikselt saatmata.

### 8.2 E-kirja mallid

Kõik HTML-kirjad kasutavad ühtset TNP kaubamärgiga kujundust (lilla päis `#4a1aa1`, valge sisuplokk, kontaktinfo jaluses). Kolm HTML-malli:

- **Tellimuse staatuse muutus** — dünaamiline pealkiri ja sisu vastavalt uuele staatusele, tellimuse numbri ja oleku märgis, admini märkuse väli (kollane infokast)
- **Uue tellimuse teavitus adminile** — tellimuse kuupäev, numbri märgis, kliendi andmed (nimi, e-post, telefon), toodete tabel koguste ja ridade summadega, kogusumma
- **Tellimus saadetud kliendile** — saadetise teave (kuller, jälgimiskood), "Jälgi saadetist" nupp koos veebilingiga

Kõik 12 tellimuse staatust (`pending`, `payment_pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `payment_failed`, `expired`, `manual_review`, `refunded`, `preorder`) on kaetud eestikeelsete siltide, värvide, pealkirjade ja teemadega.

### 8.3 Saatmise funktsioonid

| Funktsioon | Millal saadetakse | Saaja | Vorming |
|---|---|---|---|
| `sendOrderConfirmationEmail()` | Makse kinnituse järel | Klient | Lihttekst (seadistatav sisu) |
| `sendOrderStatusUpdate()` | Admin muudab tellimuse staatust | Klient | HTML (staatuse mall) |
| `sendOrderShippedEmail()` | Admin vajutab "Saada teele" | Klient | HTML (jälgimisinfoga) |
| `sendNewOrderAdminEmail()` | Uus tellimus esitatud | Admin (`tellimused@tnp.ee`) | HTML (tellimuse kokkuvõte) |

Iga saadetud kiri logitakse `commerce.outbox` tabelisse koos `event_type` ja `payload`-ga. Outbox toimib saatmislogina ning idempotentsuse kontrollina (topelt-saatmise vältimine).

### 8.4 Teavituste haldus (admin-liideses)

Admini seadete lehel (`/haldus/seaded`) on kaks teavitustega seotud sakki:

**"E-kirjad" sakk:**
- Saatja aadress (nt `Kirjastus Tanapaev <tellimused@tnp.ee>`)
- Tellimuse kinnituse teema ja sisu — toetab malle: `{{customerName}}`, `{{orderNumber}}`, `{{total}}`, `{{itemLines}}`

**"Teavitused" sakk:**
- 12 lülitit iga tellimuse staatuse kohta, millega saab vastava automaatkirja sisse/välja lülitada
- Vaikimisi on kõik teavitused **sees**
- Kui lüliti on väljas, jäetakse vastav kiri vaikselt saatmata

### 8.5 Automaatsed e-kirja käivitajad

| Sündmus | Saadetav kiri | Fail |
|---|---|---|
| Maksekeskuse makse õnnestumine (webhook/return) | Tellimuse kinnitus kliendile | `src/app/api/maksekeskus/webhook/route.ts`, `src/app/api/maksekeskus/return/route.ts` |
| Kassa edukas lõpetamine | Uue tellimuse teavitus adminile | `src/app/api/checkout/route.ts` |
| Admin muudab tellimuse staatust | Staatuse muutuse teavitus kliendile | `src/app/haldus/order-actions.ts` |
| Admin vajutab "Saada teele" | Saadetise teavitus kliendile | `src/app/haldus/order-actions.ts` |

### 8.6 Uudiskirja liitumine (Smaily)

- **API:** `POST /api/newsletter/subscribe` — valideerib päritolu, piirab 10 päringut/minutis, logib nõusoleku `smaily.consent_log`-i (SHA-256 räsiga user-agent ja keel)
- **Smaily API:** `src/lib/smaily/server.ts` — Basic Auth autentimine, 8-sekundiline ajalimiit
- **Ebaõnnestumise korral:** lisatakse `smaily.retry_queue` järjekorda
- **Kordus-Cron:** `POST /api/cron/smaily` — töötleb kuni 20 ebaõnnestunud liitumist korraga, kaitstud `CRON_SECRET` päisega
- **Esikülje komponent:** `NewsletterSection.tsx` — e-posti sisend koos `source=footer` peidetud väljaga, kuvab õnnestumise/vea tagasisidet

### 8.7 Kontaktivorm

- **API:** `POST /api/contact` — valideerib päritolu, piirab 3 päringut/minutis
- Võtab vastu: `name`, `email`, `message`, `locale` (et/en)
- Salvestab sõnumi `content.contact_messages` tabelisse ja loob `contact.received` outbox-kirje
- Ei saada Resend kaudu eraldi e-kirja — sõnum on andmebaasis tulevase töötluse jaoks
- Esiküljel saadaval nii eesti kui inglise keeles

### 8.8 Saadavuse päring

- **API:** `POST /api/availability-request` — valideerib päritolu, piirab 10 päringut/minutis
- Saadab HTML-kirja aadressile `kristi@tnp.ee` raamatu pealkirja ja kliendi e-postiga
- Logib `commerce.outbox` tabelisse `event_type: "availability_request"`
- Esikülje modaal avaldub tootelehel, kui raamat on laost otsas

### 8.9 Outbox süsteem

`commerce.outbox` tabel salvestab kõik e-posti sündmused (`email.order_confirmation`, `email.status_update`, `email.order_shipped`, `availability_request`, `contact.received`). Andmebaasis on funktsioonid `claim_outbox`, `complete_outbox`, `fail_outbox` töötlemiseks, kuid rakenduse-tasemel cron-töötlejat veel ei ole — outbox toimib peamiselt logina ja idempotentsuse kontrollina (topelt-saatmise vältimine).

---

## Kokkuvõte

| Valdkond | Muudatusi |
|---|---|
| Kassa & maksed | Ostukorv, tellimused, Maksekeskus, 39 testi, vealogimine |
| Admin-ala | Tooted, kampaaniad, blogi, kliendid, avaleht, taksonoomia, import |
| Turvalisus | Auditi parandused, RLS, rate limiting, N+1 optimeerimine |
| Ehitus & deploy | Vercel, Turbopack, jsdom, Supabase migratsioonid |
| Keeleparandused | Eesti tähemärgid, siltide korrastus |
| Andmebaas | 31 migratsioonifaili, sh order status history, customer accounts |
| E-kirjad & teavitused | 3 HTML-malli, 4 saatmisfunktsiooni, 12 staatuse lülitit, Smaily uudiskiri, kontaktivorm, saadavuse päring, outbox süsteem |
| Komponendid | ~60 React komponenti (poe-, admin- ja UI-komponendid) |
