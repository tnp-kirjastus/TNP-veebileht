import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Võta meiega ühendust — vastame esimesel võimalusel.",
  alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
  return <LayoutContained><section className="py-[50px] border-b border-line"><Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Kontakt" }]} /><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Kontakt</h1><p className="max-w-[620px] mt-4 text-muted">Võta meiega ühendust — vastame esimesel võimalusel.</p></section><div className="grid grid-cols-[1fr_1fr] gap-[38px] py-12 max-[900px]:grid-cols-1"><div className="grid gap-7 content-start"><div><h2 className="font-heading text-2xl mb-[10px]">Kirjastus Tänapäev</h2><p className="text-muted leading-relaxed">Tellimused ja raamatute saatmine üle Eesti. Pakiautomaati või kulleriga.</p></div><div><h2 className="font-heading text-2xl mb-[10px]">E-post</h2><a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a></div><div><h2 className="font-heading text-2xl mb-[10px]">Telefon</h2><p className="text-muted"><a href="tel:+3726691890" className="text-accent font-bold">+372 669 1890</a> (E–R 9–17)</p></div><div><h2 className="font-heading text-2xl mb-[10px]">Aadress</h2><p className="text-muted">Pärnu mnt 20, 10141 Tallinn, Eesti</p></div><a href="https://www.openstreetmap.org/search?query=P%C3%A4rnu%20mnt%2020%20Tallinn" target="_blank" rel="noopener noreferrer" className="min-h-[260px] border border-line bg-soft flex items-center justify-center text-accent font-bold">Ava kaart ↗</a></div><ContactForm locale="et" /></div><NewsletterSection /></LayoutContained>;
}
