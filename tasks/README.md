# TNP Store — Arendusülesanded

Kokku **21 taski** põhjalike juhiste ja failide viidetega.

## Ülevaade

| # | Fail | Kirjeldus |
|---|------|-----------|
| 01 | `01-noticebar-header.md` | Eemalda NoticeBar + Ehita ümber header (pikk otsinguriba, FB/IG/Konto/Ostukorv) |
| 02 | `02-menu-bar.md` | Globaalne menüüriba logo alla (UUDISED, UUED RAAMATUD, RAAMATUD, SARJAD, AUTORID, SOODUS, KIRJASTUS) |
| 03 | `03-footer.md` | Jaluse muudatused (eemalda tagline, lisa firma andmed, muuda email) |
| 04 | `04-admin-encoding.md` | Admin paneeli encoding fix — "Nähtav" |
| 05 | `05-product-tree.md` | Tootepuu ümberehitus (alamkategooriad, multi-select, "Näita kõiki" fix) |
| 06 | `06-discount-ticker.md` | Allahindluse protsentide scroller sticky menüü kohal |
| 07 | `07-upcoming-books.md` | Ilmuvad raamatud — ettetellimise süsteem (allow_preorder, ilma maksmiseta) |
| 08 | `08-product-detail.md` | Raamatu kirje täiendused (kuupäev DD.MM.YYYY, klikitavad isikud, seotud ribad) |
| 09 | `09-series-page.md` | Teemaleht SARJAD — review ja täiendus |
| 10 | `10-soodus-page.md` | PAKKUMISED → SOODUS (kõik viited) |
| 11 | `11-authors-page.md` | UUS teemaleht AUTORID (tähestiku järgi) |
| 12 | `12-contact-page.md` | Kontakt lehe jaemüüjate uuendus |
| 13 | `13-cart-checkout.md` | Ostukorvi ja kassa täiendused (eemalda Kuller, KM, arve, sooduskood) |
| 14 | `14-availability-request.md` | "Küsi saadavust" nupp 0 laoseisuga raamatutele |
| 15 | `15-build-qa-cleanup.md` | Build, lint, testid ja debug cleanup rohelisse seisu |
| 16 | `16-homepage-finish.md` | Esilehe pooleli jäänud kliendikommentaarid ja bännerilingid |
| 17 | `17-page-copy-breadcrumb-cleanup.md` | Teemalehtede breadcrumbide ja ebavajalike kirjelduste eemaldamine |
| 18 | `18-preorder-cart-order-integrity.md` | Ettetellimise cart/order serveriloogika terviklikkus |
| 19 | `19-discount-ticker-position.md` | Soodusprotsentide riba peab jääma menüüriba alla |
| 20 | `20-wordpress-news-import.md` | Vana WordPressi uudiste import Next.js/Supabase sisumudelisse |
| 21 | `21-checkout-maksekeskus-failure.md` | Maksekeskuse makse algatamise vea diagnoos ja parandus |

## Prioriteedid

### Kõrge prioriteet (kohe)
1. **Task 1** — NoticeBar + Header (kliendi esimene mulje)
2. **Task 2** — Menüüriba (navigatsiooni struktuur)
3. **Task 3** — Jalus (kontaktinfo korrektsus)
4. **Task 15** — Build/QA cleanup (release gate)
5. **Task 19** — Soodusprotsentide riba menüü alla (kliendi uus täpsustus)

### Keskmine prioriteet
6. **Task 4** — Admin encoding fix
7. **Task 5** — Tootepuu (kategooriate navigatsioon)
8. **Task 7** — Ilmuvad raamatud
9. **Task 8** — Raamatu kirje täiendused
10. **Task 11** — Autorite leht
11. **Task 16** — Esilehe lõpetamine
12. **Task 17** — Teemalehtede cleanup
13. **Task 18** — Ettetellimise terviklikkus

### Madalam prioriteet (täiendused)
14. **Task 6** — Discount ticker
15. **Task 9** — Sarjad review
16. **Task 10** — Soodus nimevahetus
17. **Task 12** — Kontakt leht
18. **Task 13** — Ostukorv/kassa
19. **Task 14** — Küsi saadavust

## Andmebaasi muudatused (migrations)

| Task | Migration | Sisu |
|------|-----------|------|
| 07 | `021_allow_preorder.sql` | `allow_preorder BOOLEAN` veerg products tabelisse |
| 08 | `022_product_editions.sql` | `editions JSONB` veerg products tabelisse |
| 13 | `023_order_extras.sql` | Arve ja sooduskoodi veerud orders tabelisse |

## Testimiseks

```
npm run dev      # Arendusserver
npm run build    # Buildi kontroll
npm run lint     # ESLint
npm run typecheck # TypeScript
npm test         # Vitest
npm run regen-json  # Andmete JSON failide uuendamine Supabase'ist
```
