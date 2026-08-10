import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { ContactForm } from "@/components/contact/ContactForm";

// Ainus ingliskeelne leht — eraldiseisev, ilma i18n-raamistikuta.
export const metadata: Metadata = {
  title: "Contact — Tänapäev Publishers",
  description: "Get in touch with Tänapäev Publishers — we will respond as soon as possible.",
  alternates: { canonical: "/en/contact" },
};

export default function ContactPageEn() {
  return <LayoutContained><section className="py-[50px] border-b border-line"><h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Contact</h1><p className="max-w-[620px] mt-4 text-muted">Get in touch with us — we will respond as soon as possible.</p></section><div className="grid grid-cols-[1fr_1fr] gap-[38px] py-12 max-[900px]:grid-cols-1"><div className="grid gap-7 content-start"><div><h2 className="font-heading text-2xl mb-[10px]">Tänapäev Publishers</h2><p className="text-muted leading-relaxed">Orders and book deliveries across Estonia. Parcel machine or courier delivery.</p></div><div><h2 className="font-heading text-2xl mb-[10px]">Email</h2><a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a></div><div><h2 className="font-heading text-2xl mb-[10px]">Phone</h2><p className="text-muted"><a href="tel:+3726691890" className="text-accent font-bold">+372 669 1890</a> (Mon–Fri 9–17)</p></div><div><h2 className="font-heading text-2xl mb-[10px]">Address</h2><p className="text-muted">Pärnu mnt 20, 10141 Tallinn, Estonia</p></div><a href="https://www.openstreetmap.org/search?query=P%C3%A4rnu%20mnt%2020%20Tallinn" target="_blank" rel="noopener noreferrer" className="min-h-[260px] border border-line bg-soft flex items-center justify-center text-accent font-bold">Open map ↗</a></div><ContactForm locale="en" /></div><NewsletterSection /></LayoutContained>;
}
