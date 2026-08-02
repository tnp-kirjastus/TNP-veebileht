import Link from "next/link";
import { LayoutContained } from "@/components/layout";

export default function NotFound() {
  return (
    <LayoutContained>
      <section className="py-20 text-center">
        <p className="text-sm font-extrabold uppercase tracking-wide text-accent">Viga 404</p>
        <h1 className="mt-3 font-heading text-[clamp(42px,7vw,68px)]">Lehte ei leitud</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Otsitud lehte või raamatut ei ole olemas. Kontrolli aadressi või jätka raamatute sirvimist.
        </p>
        <Link href="/raamatud" className="mt-8 inline-flex min-h-12 items-center border border-ink bg-white px-6 font-extrabold text-ink hover:bg-ink hover:text-white">
          Vaata raamatuid
        </Link>
      </section>
    </LayoutContained>
  );
}
