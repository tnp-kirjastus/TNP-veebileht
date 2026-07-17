# Task 7: Ilmuvad Raamatud — Ettetellimise Süsteem

## Kirjeldus
- "Uued raamatud" → "Ilmuvad Raamatud"
- Ilmuvad raamatud ei ole hinnaga tooted, neid saab ette tellida
- Ettetellimisel ei toimu makset (Maksekeskust ei kasutata)
- Checkout lehel pealkirjaks "Raamatu tellimine"
- Võimalus näidata raamatut "Ilmumas" tunnusega, kuid eemaldada tellimise võimalus

## Failid

### 1. Andmebaas — uus veerg

Lisa migration (uus fail `supabase/migrations/021_allow_preorder.sql`):

```sql
-- Lisa veerg, mis määrab kas Ilmumas raamatut saab ette tellida
ALTER TABLE commerce.products
ADD COLUMN allow_preorder BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN commerce.products.allow_preorder IS
  'Kui true ja is_upcoming=true, saab raamatut ette tellida. Kui false, näidatakse ainult "Ilmumas" ilma tellimisvõimaluseta.';
```

### 2. Admin tootevorm — `src/app/haldus/(protected)/tooted/`

Lisa `allow_preorder` checkbox toote vormi (admin paneel):
- Toote lisamise vorm: `src/app/haldus/(protected)/tooted/uus/page.tsx`
- Toote muutmise vorm: `src/app/haldus/(protected)/tooted/[id]/page.tsx`
- Lisa checkbox "Luba ettetellimine" (ainult kui `is_upcoming = true`)

### 3. `src/app/raamat/[slug]/AddToCartButton.tsx`

Muuda nupu loogikat:

```tsx
export function AddToCartButton({ product, disabled = false }: {
  product: {
    slug: string; title: string; author: string;
    price: number; salePrice?: number | null;
    coverImage?: string | null;
    isUpcoming?: boolean;
    allowPreorder?: boolean;
    stock?: number;
    isArchived?: boolean;
  };
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const { open: openCart } = useCartDrawer();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (disabled) return;
    addItem(product);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  const buttonLabel = (() => {
    if (product.isArchived) return "Läbimüüdud";
    if (product.isUpcoming && !product.allowPreorder) return "Ilmumas";
    if (product.isUpcoming && product.allowPreorder) return "Ettetelli";
    if (product.stock !== undefined && product.stock < 1) return "Küsi saadavust";  // ← Task 14
    return added ? "Lisatud!" : "Lisa ostukorvi";
  })();

  const isDisabled = product.isArchived
    || (product.isUpcoming && !product.allowPreorder)
    || (product.stock !== undefined && product.stock < 1 && !product.isUpcoming);

  return (
    <button onClick={handleAdd} disabled={isDisabled || disabled}
      className="...">
      <svg>...</svg>
      {buttonLabel}
    </button>
  );
}
```

### 4. `src/app/raamat/[slug]/page.tsx`

Edasta uued väljad AddToCartButtonile:

```tsx
<AddToCartButton
  disabled={product.is_archived || (product.is_upcoming && !product.allow_preorder)}
  product={{
    slug: product.slug,
    title: product.title_et,
    author: authorNames,
    price: product.price,
    salePrice: product.sale_price,
    coverImage: product.cover_image,
    isUpcoming: product.is_upcoming,
    allowPreorder: product.allow_preorder,
    stock: product.stock,
    isArchived: product.is_archived,
  }}
/>
```

### 5. `src/app/ostukorv/kassa/page.tsx`

Dünaamiline pealkiri — kui ostukorvis on ainult ettetellimise raamatud, siis "Raamatu tellimine":
```tsx
// Lehe pealkiri:
const hasOnlyPreorders = items.every(item => item.isUpcoming && item.allowPreorder);
const pageTitle = hasOnlyPreorders ? "Raamatu tellimine" : "Vormista tellimus";
```

### 6. `src/app/api/checkout/route.ts`

Kui kõik tooted on `is_upcoming && allow_preorder`:
- Ära kutsu Maksekeskust
- Salvesta tellimus staatusega `"preorder"`
- Saada email kinnituseks
- Tagasi suuna kinnituslehele (mitte maksele)

```ts
// Pärast toodete valideerimist, enne makse loomist:
const allPreorder = orderItems.every(item => {
  const p = dbProductMap.get(item.slug);
  return p?.is_upcoming && p?.allow_preorder;
});

if (allPreorder) {
  // Loo tellimus ilma maksmiseta
  const order = await db.schema("commerce").from("orders").insert({
    order_number: orderNumber,
    status: "preorder",  // või "pending"
    customer_name: parsed.data.name,
    customer_email: parsed.data.email,
    // ...
    subtotal: 0,  // ettetellimisel summa 0
    shipping_cost: 0,
    total: 0,
  }).select("...").single();

  return NextResponse.json({
    redirectUrl: `/tellimus/${order.confirmation_token}`,
    confirmationToken: order.confirmation_token,
  });
}
```

### 7. `src/lib/data-types.ts`

Lisa uus väli Product tüübile:
```ts
export interface Product {
  // ... olemasolevad
  allow_preorder: boolean;  // ← uus
}
```

### 8. `scripts/regenerate-json.mjs`

Veendu, et `allow_preorder` eksporditakse products.json faili.

### 9. Ostukorvi kontekst — `src/lib/cart-context.tsx`

Lisa `isUpcoming` ja `allowPreorder` CartItemile:
```ts
export interface CartItem {
  slug: string;
  title: string;
  author: string;
  price: number;
  salePrice: number | null;
  coverImage: string | null;
  quantity: number;
  isUpcoming?: boolean;     // ← uus
  allowPreorder?: boolean;  // ← uus
}
```

## Vastuvõtukriteeriumid
- [ ] Admin paneelis saab tootel märkida "Luba ettetellimine"
- [ ] `is_upcoming = true && allow_preorder = true` → nupp "Ettetelli", toimib nagu tavaline "Lisa ostukorvi"
- [ ] `is_upcoming = true && allow_preorder = false` → nupp "Ilmumas" (disabled), ei saa tellida
- [ ] Kui ostukorvis on ainult ettetellimise raamatud → kassa pealkiri "Raamatu tellimine"
- [ ] Ettetellimisel Maksekeskust EI kasutata, tellimus salvestatakse otse
- [ ] `is_upcoming = false && stock = 0` → nupp "Küsi saadavust" (eraldi task)
