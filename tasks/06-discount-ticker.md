# Task 6: Allahindluse Protsentide Scroller Sticky Menüü Peal

## Kirjeldus
Allahindluse protsendid ("-25%", "-30%", "-50%" jne) scrollivad horisontaalselt ülemises ribas, mis asub sticky menüü kohal.

## Uus fail

### `src/components/layout/DiscountTicker.tsx`

Loome uue komponendi, mis kuvab scrolliva riba aktiivsete soodustoodete protsentidega.

```tsx
// src/components/layout/DiscountTicker.tsx
import { getSaleProducts, getSalePercent } from "@/lib/data";
import type { Product } from "@/lib/data-types";

export function DiscountTicker() {
  // Server component — loeb hetkel aktiivsed soodustooted
  const saleProducts = getSaleProducts();
  const percents = [...new Set(
    saleProducts.map(p => getSalePercent(p)).filter(p => p > 0).sort((a, b) => a - b)
  )];

  if (percents.length === 0) return null;

  return (
    <div className="bg-[#fff3e0] border-b border-line overflow-hidden h-[38px]">
      <div className="flex items-center h-full whitespace-nowrap">
        <div className="flex gap-8 animate-scroll">
          {/* Duplikeeri protsendid, et scroll looks lõputu */}
          {[...percents, ...percents, ...percents].map((p, i) => (
            <span key={i} className="text-accent font-extrabold text-lg">
              &minus;{p}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

CSS animatsioon — lisa `src/app/globals.css`:
```css
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-scroll {
  animation: scroll 30s linear infinite;
}
```

### Nuudatused olemasolevates failides

### `src/components/layout/LayoutFull.tsx`
Lisa DiscountTicker ENNE Headerit (sticky menüü kohale):
```tsx
import { DiscountTicker } from "@/components/layout/DiscountTicker";
// ...
<DiscountTicker />
<Header />
```

Sama muudatus kõigis layout komponentides:
- `src/components/layout/LayoutContained.tsx`
- `src/components/layout/LayoutSidebar.tsx`

### Alternatiivne lähenemine (kui server component ei sobi)

Kui DiscountTicker vajab kliendipoolset renderdamist (nt dünaamiline uuendamine), tee sellest client component:

```tsx
"use client";
import { useEffect, useState } from "react";

export function DiscountTickerClient() {
  const [percents, setPercents] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/sale-percents")
      .then(r => r.json())
      .then(data => setPercents(data.percents))
      .catch(() => {});
  }, []);

  if (percents.length === 0) return null;
  // ... sama render
}
```

## Vastuvõtukriteeriumid
- [ ] Üleval pool (sticky headerist kõrgemal) on riba, kus scrollivad allahindluse protsendid
- [ ] Protsendid on unikaalsed ja sorteeritud
- [ ] Riba kerib lõputult
- [ ] Kui aktiivseid soodustooteid pole, siis riba ei kuvata
- [ ] Riba ei kata sticky menüüd
