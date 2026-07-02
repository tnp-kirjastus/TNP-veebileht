import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { ContactForm } from "@/components/contact/ContactForm";

const content = {
  et: { title: "Kontakt", subtitle: "Võta meiega ühendust — vastame esimesel võimalusel.", publisher: "Kirjastus Tänapäev", intro: "Tellimused ja raamatute saatmine üle Eesti. Pakiautomaati või kulleriga.", email: "E-post", phone: "Telefon", address: "Aadress", hours: "E–R 9–17", country: "Eesti" },
  en: { title: "Contact", subtitle: "Get in touch with us — we will respond as soon as possible.", publisher: "Tänapäev Publishers", intro: "Orders and book deliveries across Estonia. Parcel machine or courier delivery.", email: "Email", phone: "Phone", address: "Address", hours: "Mon–Fri 9–17", country: "Estonia" },
} as const;

export function generateStaticParams() { return [{ locale: "et" }, { locale: "en" }]; }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const locale = (await params).locale as "et" | "en"; if (!(locale in content)) return {}; return { title: content[locale].title, description: content[locale].subtitle, alternates: { canonical: `/${locale}/kontakt`, languages: { et: "/et/kontakt", en: "/en/kontakt" } } }; }

export default async function LocalizedContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  if (locale !== "et" && locale !== "en") notFound();
  const t = content[locale];
  return <LayoutContained><section className="py-[50px] border-b border-line"><Breadcrumbs crumbs={[{ label: locale === "et" ? "Esileht" : "Home", href: "/" }, { label: t.title }]} /><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">{t.title}</h1><p className="max-w-[620px] mt-4 text-muted">{t.subtitle}</p></section><div className="grid grid-cols-[1fr_1fr] gap-[38px] py-12 max-[900px]:grid-cols-1"><div className="grid gap-7 content-start"><div><h2 className="font-heading text-2xl mb-[10px]">{t.publisher}</h2><p className="text-muted leading-relaxed">{t.intro}</p></div><div><h2 className="font-heading text-2xl mb-[10px]">{t.email}</h2><a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a></div><div><h2 className="font-heading text-2xl mb-[10px]">{t.phone}</h2><p className="text-muted"><a href="tel:+3726691890" className="text-accent font-bold">+372 669 1890</a> ({t.hours})</p></div><div><h2 className="font-heading text-2xl mb-[10px]">{t.address}</h2><p className="text-muted">Pärnu mnt 20, 10141 Tallinn, {t.country}</p></div><a href="https://www.openstreetmap.org/search?query=P%C3%A4rnu%20mnt%2020%20Tallinn" target="_blank" rel="noopener noreferrer" className="min-h-[260px] border border-line bg-soft flex items-center justify-center text-accent font-bold">{locale === "et" ? "Ava kaart" : "Open map"} ↗</a></div><ContactForm locale={locale} /></div><NewsletterSection /></LayoutContained>;
}

