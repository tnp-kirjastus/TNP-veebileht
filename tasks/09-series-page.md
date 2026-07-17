# Task 9: Teemaleht SARJAD

## Kirjeldus
Kontrolli ja parenda sarjade lehte. Kõik sarjad on järjestatud sarja viimati ilmunud raamatu alusel.

## Fail

### `src/app/sarjad/page.tsx`

Hetkel see leht juba eksisteerib ja töötab õigesti:
- Sarjad järjestatakse viimati ilmunud raamatu alusel ✓
- Iga sari kuvab kuni 5 raamatut ✓
- Raamatud viivad toote lehele ✓

Vajalikud väikesed täiendused:

```tsx
// Muuda pealkiri ja kirjeldus:
export const metadata: Metadata = {
  title: "Sarjad",
  description: "Kõik raamatusarjad on järjestatud sarja viimati ilmunud raamatu alusel."
};

// Lehel:
<h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Sarjad</h1>
<p className="max-w-[620px] mt-4 text-muted">
  Kõik raamatusarjad on järjestatud sarja viimati ilmunud raamatu alusel. Raamatud viivad toote täpsemasse vaatesse.
</p>

// Lisada tühja oleku käsitlemine:
{series.length === 0 && (
  <Shell>
    <div className="my-12 border border-dashed border-line p-12 text-center text-muted">
      Ühtegi sarja ei leitud.
    </div>
  </Shell>
)}
```

## Vastuvõtukriteeriumid
- [ ] Sarjade leht `/sarjad` kuvab kõik sarjad
- [ ] Sarjad on järjestatud viimati ilmunud raamatu alusel
- [ ] Iga sari kuvab kuni 5 raamatut
- [ ] Raamatul klikkides avaneb toote detailvaade
- [ ] Tühja oleku korral kuvatakse sõbralik teade
