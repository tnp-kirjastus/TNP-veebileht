import type { Metadata } from "next";
import Link from "next/link";
import { LayoutFull, Shell } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { ProductGrid } from "@/components/store/ProductGrid";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { getArchivedProducts, type Product } from "@/lib/data";

export const metadata: Metadata = {
  title: "Läbimüüdud raamatud",
  description: "Kirjastus Tänapäev varem ilmunud ja läbimüüdud raamatute arhiiv.",
};

function card(product: Product) {
  return {
    slug: product.slug,
    title: product.title_et,
    author: product.people.author?.join(", ") || "",
    price: product.price,
    effectivePrice: product.price,
    coverImage: product.cover_image,
    isArchived: true,
  };
}

function href(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/arhiiv?${params}`;
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim().toLocaleLowerCase("et") ?? "";
  const all = getArchivedProducts().filter((product) => !query || product.title_et.toLocaleLowerCase("et").includes(query)
    || product.people.author?.some((author) => author.toLocaleLowerCase("et").includes(query)));
  const parsed = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
  const pageSize = 48;
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const products = all.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <LayoutFull>
    <section className="py-[50px] border-b border-line"><Shell>
      <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Läbimüüdud" }]} />
      <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Läbimüüdud</h1>
      <p className="max-w-[680px] mt-4 text-muted">Kõik Tänapäeva arhiivis olevad raamatud. Neid teoseid ei saa praegu ostukorvi lisada.</p>
      <form className="mt-7 flex max-w-xl"><input type="search" name="q" defaultValue={params.q} placeholder="Otsi arhiivist" className="h-12 flex-1 border border-ink px-4" /><button className="h-12 border border-ink bg-white text-ink px-6 font-extrabold hover:bg-ink hover:text-white transition-colors">Otsi</button></form>
    </Shell></section>
    <Shell><div className="flex justify-between gap-4 py-8"><p className="text-muted">{all.length} raamatut</p>{query && <Link href="/arhiiv" className="font-bold text-accent">Tühista otsing</Link>}</div>
      <ProductGrid products={products.map(card)} columns={4} emptyMessage="Arhiivist ei leitud vasteid." />
      {totalPages > 1 && <nav aria-label="Arhiivi leheküljed" className="flex flex-wrap justify-center gap-2 py-10">
        {currentPage > 1 && <Link href={href(currentPage - 1, query)} className="border border-line px-4 py-2 font-bold">← Eelmine</Link>}
        <span className="px-4 py-2">{currentPage} / {totalPages}</span>
        {currentPage < totalPages && <Link href={href(currentPage + 1, query)} className="border border-line px-4 py-2 font-bold">Järgmine →</Link>}
      </nav>}
    </Shell>
    <NewsletterSection />
  </LayoutFull>;
}
