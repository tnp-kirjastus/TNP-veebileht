# Task 14: "Küsi Saadavust" — Laoseis 0 Toodetele

## Kirjeldus
Kui raamatu laoseis e-poes on 0 ja raamat EI ole läbimüüdud (`is_archived = false`) ega ettetellitav, siis "Lisa ostukorvi" või "Läbimüüdud" asemel kuvatakse nupp "Küsi saadavust". Soovija jätab oma e-posti aadressi ning päring tuleb aadressile kristi@tnp.ee.

## Nupu loogika kokkuvõte

```
is_archived = true                     → "Läbimüüdud" (disabled)
is_upcoming && allow_preorder          → "Ettetelli"
is_upcoming && !allow_preorder         → "Ilmumas" (disabled)
stock > 0                              → "Lisa ostukorvi"
stock === 0 && !is_upcoming            → "Küsi saadavust" ← UUS
```

## Failid

### 1. `src/app/raamat/[slug]/AddToCartButton.tsx`

Muuda nupp toetama "Küsi saadavust" olekut:

```tsx
"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useCartDrawer } from "@/lib/cart-drawer-context";
import { AvailabilityModal } from "./AvailabilityModal";

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
  const [showAvailability, setShowAvailability] = useState(false);

  const stock = product.stock ?? 0;

  function handleAdd() {
    if (disabled) return;
    addItem(product);
    setAdded(true);
    openCart();
    setTimeout(() => setAdded(false), 1500);
  }

  // Määra, milline olek:
  const isArchived = product.isArchived;
  const isUpcomingNoPreorder = product.isUpcoming && !product.allowPreorder;
  const isUpcomingPreorder = product.isUpcoming && product.allowPreorder;
  const isOutOfStock = stock === 0 && !product.isUpcoming;

  const label = isArchived
    ? "Läbimüüdud"
    : isUpcomingNoPreorder
      ? "Ilmumas"
      : isUpcomingPreorder
        ? "Ettetelli"
        : isOutOfStock
          ? "Küsi saadavust"
          : added
            ? "Lisatud!"
            : "Lisa ostukorvi";

  const isDisabled = isArchived || isUpcomingNoPreorder || disabled;
  const isAvailability = isOutOfStock && !isArchived;

  function handleClick() {
    if (isAvailability) {
      setShowAvailability(true);
      return;
    }
    handleAdd();
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`inline-flex items-center gap-[10px] self-start min-h-[52px] px-8 border font-extrabold transition-colors duration-200
          ${isAvailability
            ? "border-accent bg-white text-accent hover:bg-accent hover:text-white"
            : isDisabled
              ? "bg-soft text-muted border-line cursor-not-allowed"
              : "border-ink bg-ink text-white hover:bg-[#2a2d30]"
          }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {isAvailability ? (
            <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>
          ) : (
            <><path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/></>
          )}
        </svg>
        {label}
      </button>

      {showAvailability && (
        <AvailabilityModal
          productTitle={product.title}
          onClose={() => setShowAvailability(false)}
        />
      )}
    </>
  );
}
```

### 2. UUS: `src/app/raamat/[slug]/AvailabilityModal.tsx`

```tsx
"use client";

import { FormEvent, useState } from "react";

export function AvailabilityModal({ productTitle, onClose }: {
  productTitle: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/availability-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), productTitle }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Päringu saatmine ebaõnnestus");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Midagi läks valesti");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.42)]" onClick={onClose}>
      <div className="bg-white p-8 max-w-[440px] w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted hover:text-ink text-xl leading-none">&times;</button>

        {sent ? (
          <div className="text-center py-4">
            <h3 className="font-heading text-xl mb-3">Päring saadetud!</h3>
            <p className="text-muted">
              Saadame teile teavituse, kui &quot;{productTitle}&quot; on taas saadaval.
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-heading text-xl mb-1">Küsi saadavust</h3>
            <p className="text-sm text-muted mb-5">
              {productTitle}
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-2 font-bold text-sm">
                Teie e-posti aadress
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="nimi@naide.ee"
                  className="border border-line p-3 font-normal"
                />
              </label>
              {error && <p className="text-accent text-sm">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="min-h-[46px] bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50"
              >
                {sending ? "Saadan..." : "Saada päring"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
```

### 3. UUS API: `src/app/api/availability-request/route.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import { consumeRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email().trim().max(320),
  productTitle: z.string().trim().min(1).max(500),
});

const TARGET_EMAIL = "kristi@tnp.ee";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }

  const clientKey = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!await consumeRateLimit("availability", clientKey, 10, 60)) {
    return NextResponse.json({ error: "Liiga palju päringuid. Proovi hetke pärast uuesti." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Palun sisesta korrektne e-posti aadress." }, { status: 400 });
  }

  const { email, productTitle } = parsed.data;

  try {
    const env = serverEnv();
    if (env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      await resend.emails.send({
        from: "TNP Pood <poood@tnp.ee>",
        to: TARGET_EMAIL,
        subject: `Saadavuse päring: ${productTitle}`,
        html: `
          <p>Klient soovib teada raamatu saadavust:</p>
          <p><strong>Raamat:</strong> ${productTitle}</p>
          <p><strong>Kliendi e-post:</strong> ${email}</p>
          <p><strong>Kuupäev:</strong> ${new Date().toLocaleDateString("et-EE")}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("availability_request_failed", err);
    return NextResponse.json({ error: "Päringu saatmine ebaõnnestus." }, { status: 500 });
  }
}
```

### 4. `src/app/raamat/[slug]/page.tsx`

Edasta `stock` ja `isArchived` AddToCartButtonile (vt Task 7 ja 8).

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

## Vastuvõtukriteeriumid
- [ ] `stock === 0 && !is_archived && !is_upcoming` → nupp "Küsi saadavust"
- [ ] Nupp on erineva stiiliga (valge taust, punane ääris, accent tekst)
- [ ] Nupule klikkides avaneb modaalaken
- [ ] Modaalis on e-posti väli ja "Saada päring" nupp
- [ ] Päring saadetakse aadressile kristi@tnp.ee
- [ ] Päring sisaldab: raamatu pealkirja, kliendi e-posti, kuupäeva
- [ ] Rate limit: max 10 päringut minutis IP kohta
- [ ] Pärast saatmist kuvatakse kinnitusmodaalis
