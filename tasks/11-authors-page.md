# Task 11: Teemaleht AUTORID (UUS!)

## Kirjeldus
Uus leht `/autorid`, mis kuvab kõik autorid tähestiku järgi grupeeritult. Autori nimel klikkides filtreeritakse raamatud selle autori järgi.

## Failid

### 1. UUS: `src/app/autorid/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { LayoutFull, Shell } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { getPeople, getActiveProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Autorid",
  description: "Kõik autorid tähestiku järgi."
};

export default function AuthorsPage() {
  const people = getPeople();
  const products = getActiveProducts();

  // Loo map autorite nimedest nende raamatute arvuga
  const authorBookCounts = new Map<string, number>();
  for (const product of products) {
    for (const authorName of (product.people.author || [])) {
      authorBookCounts.set(authorName, (authorBookCounts.get(authorName) || 0) + 1);
    }
  }

  // Filtreeri ainult autorid, kellel on raamatuid
  const authorsWithBooks = people.filter(p => authorBookCounts.has(p.name));

  // Grupeeri tähestiku järgi (perekonnanime esitäht)
  function getInitial(name: string): string {
    // Eeldame, et perekonnanimi on viimane sõna
    const parts = name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1];
    return lastName.charAt(0).toUpperCase();
  }

  const grouped = Map.groupBy(authorsWithBooks, (author) => getInitial(author.name));
  const sortedLetters = [...grouped.keys()].sort();

  return (
    <LayoutFull>
      <section className="py-[50px] border-b border-line">
        <Shell>
          <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Autorid" }]} />
          <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Autorid</h1>
          <p className="max-w-[620px] mt-4 text-muted">
            Sirvi autoreid tähestiku järgi. Nimel klikkides näed kõiki autori raamatuid.
          </p>
        </Shell>
      </section>

      <Shell>
        {authorsWithBooks.length === 0 ? (
          <div className="my-12 border border-dashed border-line p-12 text-center text-muted">
            Ühtegi autorit ei leitud.
          </div>
        ) : (
          <div className="py-12 grid gap-12">
            {sortedLetters.map((letter) => {
              const authors = (grouped.get(letter) || []).sort((a, b) =>
                a.name.localeCompare(b.name, "et")
              );
              return (
                <section key={letter}>
                  <h2 className="font-heading text-[42px] text-ink/[.14] mb-4">
                    {letter}
                  </h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[6px]">
                    {authors.map((author) => (
                      <Link
                        key={author.slug}
                        href={`/raamatud?author=${encodeURIComponent(author.slug)}`}
                        className="flex items-center gap-2 p-[10px] border border-transparent hover:border-line hover:bg-soft transition-colors"
                      >
                        <span className="font-heading text-lg">{author.name}</span>
                        <span className="text-xs text-muted ml-auto whitespace-nowrap">
                          {authorBookCounts.get(author.name)} raamatut
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Shell>
      <NewsletterSection />
    </LayoutFull>
  );
}
```

### 2. `src/lib/navigation.ts`

Lisa uus menüüpunkt (juba lisatud Task 2):
```ts
{ key: "autorid", label: "Autorid", href: "/autorid" },
```

### 3. `src/lib/translations.ts`

Lisa:
```ts
nav: {
  // ... olemasolevad
  autorid: "Autorid",
},

authors_page: {
  title: "Autorid",
  description: "Sirvi autoreid tähestiku järgi. Nimel klikkides näed kõiki autori raamatuid.",
  empty: "Ühtegi autorit ei leitud.",
},
```

## Vastuvõtukriteeriumid
- [ ] `/autorid` leht kuvab kõik autorid tähestiku järgi grupeeritult
- [ ] Iga tähegrupp algab suure tähega (A, B, C, ...)
- [ ] Autori kõrval on raamatute arv
- [ ] Autori nimel klikkides minnakse `/raamatud?author=slug`
- [ ] Kuvatakse ainult autorid, kellel on vähemalt üks raamat
- [ ] Leht on responsiivne
