"use client";

import { LayoutContained } from "@/components/layout";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <LayoutContained>
      <section className="py-20 text-center">
        <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Midagi läks valesti</p>
        <h1 className="mt-3 font-heading text-[clamp(42px,7vw,68px)]">Lehe laadimine ebaõnnestus</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">Proovi lehte uuesti laadida. Kui probleem kordub, võta meiega ühendust.</p>
        <button type="button" onClick={reset} className="mt-8 min-h-12 border border-ink bg-white px-6 font-extrabold text-ink hover:bg-ink hover:text-white">
          Proovi uuesti
        </button>
      </section>
    </LayoutContained>
  );
}
