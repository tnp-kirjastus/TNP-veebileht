# Task 3: Jaluse (Footer) Muudatused

## Kirjeldus
- Eemalda tagline tekst "Kirjastus Tänapäev — Eesti suurim kirjastus..."
- Eemalda "Tellimused üle Eesti"
- Muuda email info@tanapaev.ee → tnp@tnp.ee kogu süsteemis
- Lisa logo alla firma andmed

## Failid

### 1. `src/components/layout/Footer.tsx`

Uus struktuur — kolme veeruga jalus:

```tsx
export function Footer() {
  return (
    <footer className="bg-ink text-white py-[46px] pb-8 mt-0">
      <Shell>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-[30px] max-[640px]:grid-cols-1">
          {/* Veerg 1: Logo + firma andmed */}
          <div>
            <Image src="/tanapaeva-logo.png" alt="Tänapäev" width={160} height={71}
              className="w-[160px] h-auto brightness-0 invert opacity-90" />
            <div className="mt-4 text-white/70 text-sm leading-relaxed">
              <p>AS Tänapäev</p>
              <p>Pärnu mnt. 20, 10141 Tallinn</p>
              <p>reg: 10544847</p>
              <p>KMKR nr. EE100535284</p>
            </div>
          </div>
          {/* Veerg 2: Lingid — jääb samaks */}
          <div className="flex flex-col gap-2">
            <Link href="/kasutustingimused" className="font-bold text-white/[.78] hover:text-white transition-colors">Kasutustingimused</Link>
            <Link href="/privaatsuspoliitika" className="font-bold text-white/[.78] hover:text-white transition-colors">Privaatsuspoliitika</Link>
            <Link href="/kirjastus" className="font-bold text-white/[.78] hover:text-white transition-colors">Kirjastus</Link>
          </div>
          {/* Veerg 3: Kontakt + sotsiaalmeedia */}
          <div className="flex flex-col gap-3">
            <p className="text-white/[.78]">
              <a href="mailto:tnp@tnp.ee" className="hover:text-white">tnp@tnp.ee</a>
            </p>
            {/* "Tellimused üle Eesti" — EEMALDATUD */}
            <div className="flex gap-[10px] mt-[14px]">
              <a href="https://facebook.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-white/[.28] grid place-items-center text-white hover:bg-white/[.14] transition-colors" aria-label="Facebook">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.927 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>
              </a>
              <a href="https://instagram.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-white/[.28] grid place-items-center text-white hover:bg-white/[.14] transition-colors" aria-label="Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zm-5 15.2a5.2 5.2 0 1 1 0-10.4 5.2 5.2 0 0 1 0 10.4zm5.4-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </Shell>
    </footer>
  );
}
```

### 2. `src/lib/translations.ts`
```ts
footer: {
  // tagline — EEMALDA täielikult
  terms: "Kasutustingimused",
  privacy: "Privaatsuspoliitika",
  publisher: "Kirjastus",
},
```

### 3. Otsi ja asenda `info@tanapaev.ee` → `tnp@tnp.ee` kogu süsteemis
Otsi kõikidest failidest:
```
rg "info@tanapaev\.ee" --files-with-matches
```

Tõenäoliselt leidub:
- `src/components/layout/Footer.tsx:24` ✓ (juba muudetud ülal)
- `src/app/[locale]/kontakt/page.tsx:20` — juba `tnp@tnp.ee` ✓
- Võimalikud muud failid — asenda kõik

### 4. `src/app/[locale]/kontakt/page.tsx`
Veendu, et kontakt lehel on email `tnp@tnp.ee` (rida 20 — juba on) ja telefon `+372 669 1890`.

## Vastuvõtukriteeriumid
- [ ] Jaluses ei ole teksti "Kirjastus Tänapäev — Eesti suurim kirjastus..."
- [ ] Jaluses ei ole teksti "Tellimused üle Eesti"
- [ ] Jaluses logo all on AS Tänapäev, Pärnu mnt. 20, 10141 Tallinn, reg: 10544847, KMKR nr. EE100535284
- [ ] Email tnp@tnp.ee on jaluses, kontakt lehel ja kõikjal mujal
- [ ] FB ja IG ikoonid jäävad alles
