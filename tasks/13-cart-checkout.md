# Task 13: Ostukorvi Ja Kassa Täiendused

## Kirjeldus
- Kuvada varem infot tasuta transpordi puudujäägist ("Lisa veel 15€ ja transport on tasuta")
- Tarne valikutest eemaldada Kuller
- Eeldatav tarneaeg: 3–14 tööpäeva pärast makse kinnitust
- Kinnituse lehel kogusumma selgelt näha (raamatud + saatmine = kokku)
- Käibemaksu osa kogusummast
- Checkbox "Soovin arvet firmale" + ettevõtte nimi väli
- Sooduskoodi / kupongi väli

## Failid

### 1. `src/lib/shipping/config.ts`

Eemalda Kuller (courier):

```ts
export const SHIPPING_RATES: ShippingRate[] = [
  {
    carrier: "omniva",
    method: "parcel_machine",
    price: 5.0,
    freeFrom: 40,
    label_et: "Omniva pakiautomaat",
    label_en: "Omniva parcel machine",
  },
  {
    carrier: "smartpost",
    method: "parcel_machine",
    price: 3.5,
    freeFrom: 40,
    label_et: "Smartpost pakiautomaat",
    label_en: "Smartpost parcel machine",
  },
  // Kuller — EEMALDATUD
];
```

### 2. `src/app/ostukorv/page.tsx` — Tasuta tarne progress

Juba olemas progress info (read 57-64), aga täienda:

```tsx
{needsMore > 0 && (
  <div className="mt-4 border border-dashed border-ink/20 p-4 text-center bg-soft">
    <span className="text-muted">Lisa ostukorvi veel </span>
    <strong className="text-ink">{needsMore.toFixed(2)} €</strong>
    <span className="text-muted"> ja transport on </span>
    <strong className="text-leaf">TASUTA</strong>
  </div>
)}

{needsMore <= 0 && items.length > 0 && (
  <div className="mt-4 border border-leaf/30 p-4 text-center bg-[#f0f7f0]">
    <strong className="text-leaf">Transport on tasuta!</strong>
  </div>
)}
```

### 3. `src/components/checkout/CheckoutForm.tsx`

#### 3a. Eemalda Kuller valikutest

```tsx
// Rida 288 — asenda:
{(["omniva", "smartpost"] as const).map((carrier) => {
  // ... jätka sama loogikaga, ilma "courier"-ita
})}
```

#### 3b. Eeldatav tarneaeg: 3–14 tööpäeva

```tsx
// Rida 447 — muuda tekst:
<p>
  <strong className="text-ink">Eeldatav tarneaeg:</strong>{" "}
  3–14 tööpäeva pärast makse kinnitust.
</p>
```

#### 3c. Kinnituslehel (step 3) — kogusumma selgelt

```tsx
{/* Step 3 — lisa kokkuvõte: */}
<div className="border border-ink p-4 mt-6 bg-soft">
  <h3 className="font-heading text-lg mb-3">Tellimuse kokkuvõte</h3>
  <div className="grid gap-2 text-sm">
    <div className="flex justify-between">
      <span>Raamatud</span>
      <strong>{total.toFixed(2)} €</strong>
    </div>
    {shippingCost > 0 && (
      <div className="flex justify-between">
        <span>Saatmine ({shippingLabel(data.shipping_method)})</span>
        <strong>{shippingCost.toFixed(2)} €</strong>
      </div>
    )}
    <div className="flex justify-between pt-2 border-t border-line text-lg">
      <span>Kokku</span>
      <strong>{orderTotal.toFixed(2)} €</strong>
    </div>
    <div className="flex justify-between text-xs text-muted">
      <span>sh käibemaks ({kmPercent}%)</span>
      <span>{vatAmount.toFixed(2)} €</span>
    </div>
  </div>
</div>
```

#### 3d. Käibemaksu arvutamine

Lisa arvutus CheckoutFormi:
```ts
const KM_PERCENT = 9; // raamatutele Eestis 9%
const vatAmount = orderTotal - (orderTotal / (1 + KM_PERCENT / 100));
```

#### 3e. "Soovin arvet firmale" + ettevõtte nimi

Lisa CheckoutData tüübile:
```ts
type CheckoutData = {
  name: string;
  email: string;
  phone: string;
  shipping_method: ShippingCarrier;
  address: string;
  invoiceRequested: boolean;       // ← uus
  companyName: string;              // ← uus
  companyRegCode: string;           // ← uus
};
```

Lisa step 1-sse uus osa:
```tsx
{/* Kontaktandmete all */}
<div className="border-t border-line pt-4 mt-4">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={data.invoiceRequested}
      onChange={(e) => update("invoiceRequested", e.target.checked)}
      className="accent-ink h-4 w-4"
    />
    <span className="font-bold text-sm">Soovin arvet firmale</span>
  </label>

  {data.invoiceRequested && (
    <div className={`grid gap-4 mt-4 pl-6 ${compact ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1"}`}>
      <label className="grid gap-2 font-bold text-sm">
        Ettevõtte nimi
        <input
          value={data.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          required={data.invoiceRequested}
          className="border border-line p-3 font-normal"
        />
      </label>
      <label className="grid gap-2 font-bold text-sm">
        Registrikood
        <input
          value={data.companyRegCode}
          onChange={(e) => update("companyRegCode", e.target.value)}
          required={data.invoiceRequested}
          className="border border-line p-3 font-normal"
        />
      </label>
    </div>
  )}
</div>
```

#### 3f. Sooduskoodi / kupongi väli

Lisa step 1 või 2 vahele:
```tsx
{/* Sooduskood */}
<div className="border-t border-line pt-4 mt-2">
  <label className="grid gap-2 font-bold text-sm">
    Sooduskood
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value)}
        placeholder="Sisesta sooduskood"
        className="border border-line p-3 font-normal"
      />
      <button
        type="button"
        onClick={applyCoupon}
        disabled={!couponCode.trim() || couponBusy}
        className="min-h-[46px] px-4 border border-ink font-bold bg-ink text-white hover:bg-ink/80 disabled:opacity-50"
      >
        {couponBusy ? "..." : "Rakenda"}
      </button>
    </div>
  </label>
  {couponError && <p className="text-accent text-sm mt-1">{couponError}</p>}
  {couponSuccess && <p className="text-leaf text-sm mt-1">Sooduskood rakendatud! &minus;{couponDiscount.toFixed(2)} €</p>}
</div>
```

Vajalikud state muutujad:
```ts
const [couponCode, setCouponCode] = useState("");
const [couponBusy, setCouponBusy] = useState(false);
const [couponError, setCouponError] = useState("");
const [couponSuccess, setCouponSuccess] = useState(false);
const [couponDiscount, setCouponDiscount] = useState(0);
```

### 4. `src/app/api/checkout/route.ts`

#### 4a. Eemalda Kuller valideerimisest

```ts
// Rida 25:
shipping_method: z.enum(["omniva", "smartpost"]).default("omniva"),
```

#### 4b. Lisa arve ja sooduskood väljad

```ts
const schema = z.object({
  // ... olemasolevad
  invoiceRequested: z.boolean().default(false),
  companyName: z.string().max(200).optional(),
  companyRegCode: z.string().max(50).optional(),
  couponCode: z.string().max(50).optional(),
  couponDiscount: z.number().min(0).default(0),
});
```

#### 4c. Arvuta käibemaks ja salvesta orderisse

```ts
const KM_PERCENT = 9;
const subtotalBeforeDiscount = subtotal;
const discountAmount = parsed.data.couponDiscount || 0;
const taxableSubtotal = subtotalBeforeDiscount - discountAmount;
const vatAmount = taxableSubtotal - (taxableSubtotal / (1 + KM_PERCENT / 100));
```

Salvesta orderisse:
```ts
await db.schema("commerce").from("orders").insert({
  // ... olemasolevad
  invoice_requested: parsed.data.invoiceRequested,
  company_name: parsed.data.companyName || null,
  company_reg_code: parsed.data.companyRegCode || null,
  coupon_code: parsed.data.couponCode || null,
  coupon_discount: discountAmount,
  vat_amount: vatAmount,
  vat_percent: KM_PERCENT,
});
```

### 5. Andmebaas — uued veerud

Lisa migration (`supabase/migrations/023_order_extras.sql`):

```sql
ALTER TABLE commerce.orders
ADD COLUMN invoice_requested BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN company_name TEXT,
ADD COLUMN company_reg_code TEXT,
ADD COLUMN coupon_code TEXT,
ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN vat_amount DECIMAL(10,2),
ADD COLUMN vat_percent INTEGER DEFAULT 9;

COMMENT ON COLUMN commerce.orders.vat_percent IS 'Käibemaksu protsent (Eestis raamatutele 9%)';
```

### 6. UUS: `src/app/api/coupon/validate/route.ts`

Valideeri sooduskood:
```ts
export async function POST(request: Request) {
  const { code, subtotal } = await request.json();

  // Otsi sooduskoodi andmebaasist või konfiguratsioonist
  // TODO: Implementeeri coupon valideerimise loogika
  // Hetkel: demo loogika

  if (code === "TNP2026") {
    const discount = Math.min(subtotal * 0.1, 50); // 10% max 50€
    return NextResponse.json({ valid: true, discount, label: "−10% (max 50€)" });
  }

  return NextResponse.json({ valid: false, error: "Sooduskood ei kehti või on aegunud." }, { status: 400 });
}
```

### 7. `src/app/ostukorv/kassa/page.tsx`

Dünaamiline pealkiri:
```tsx
// Kui ainult pre-order tooted:
<h1 className="...">
  {hasOnlyPreorders ? "Raamatu tellimine" : "Vormista tellimus"}
</h1>
```

## Vastuvõtukriteeriumid
- [ ] Ostukorvis on kohe näha summa, mis puudub tasuta transpordist
- [ ] Kuller on tarne valikutest eemaldatud (ainult Omniva ja Smartpost)
- [ ] Tarneaeg on "3–14 tööpäeva pärast makse kinnitust"
- [ ] Kinnituslehel on selgelt näha: raamatud X€ + saatmine Y€ = KOKKU Z€
- [ ] Kinnituslehel on käibemaksu info (sh käibemaks XX%)
- [ ] "Soovin arvet firmale" checkbox + ettevõtte nimi ja registrikood on olemas
- [ ] Sooduskoodi väli on olemas ja rakendub enne makset
- [ ] Kui ainult ettetellimise raamatud → pealkiri "Raamatu tellimine"
