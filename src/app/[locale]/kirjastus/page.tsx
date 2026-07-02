/* The approved v5 publisher layout uses a fixed map embed and historical logo images. */
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LayoutFull, Shell } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NewsletterSection } from "@/components/store/NewsletterSection";

const staff = [
  { name: "Tauno Vahter", et: "Peatoimetaja", en: "Editor-in-chief", phone: "+372 6691 894", email: "tauno@tnp.ee" },
  { name: "Mihkel Mõisnik", et: "Toimetaja", en: "Editor", phone: "+372 6691 892", email: "mihkel@tnp.ee" },
  { name: "Mari Karlson", et: "Toimetaja", en: "Editor", phone: "+372 6691 896", email: "mari@tnp.ee" },
  { name: "Priit Põhjala", et: "Toimetaja", en: "Editor", phone: "+372 6691 895", email: "priit@tnp.ee" },
  { name: "Sash Veelma", et: "Toimetaja", en: "Editor", phone: "+372 6691 893", email: "sash@tnp.ee" },
  { name: "Kristi Martin", et: "Müügi- ja turundusjuht", en: "Sales and marketing manager", phone: "+372 6691 890", email: "kristi@tnp.ee" },
];

const retailers = [
  { name: "Rahva Raamat", href: "https://www.rahvaraamat.ee/et", et: "Peterburi tee 92E, 11415 Tallinn\nTel: (+372) 618 0010", en: "Peterburi tee 92E, 11415 Tallinn\nPhone: (+372) 618 0010" },
  { name: "Apollo Raamatud", href: "https://www.apollo.ee/", et: "Põikmäe 2, Tänassilma küla, 76406 Saku vald, Harjumaa\nTel: (+372) 633 6000", en: "Põikmäe 2, Tänassilma village, 76406 Saku municipality\nPhone: (+372) 633 6000" },
  { name: "Raamatukodu", href: "https://www.raamatukodu.ee/", et: "Esinduspood T1 Mall of Tallinnas\nPeterburi tee 2, 11415 Tallinn\nTel: (+372) 5191 8192", en: "Bookshop at T1 Mall of Tallinn\nPeterburi tee 2, 11415 Tallinn\nPhone: (+372) 5191 8192" },
];

const content = {
  et: {
    title: "Kirjastus", subtitle: "Saame tuttavaks — meie inimesed, kontaktandmed ja lugu.", team: "Toimetus", company: "AS Tänapäev", retailers: "Hulgimüük ja edasimüüjad", about: "Kirjastusest",
    paragraphs: [
      "Kirjastus Tänapäev alustas tööd 1999. aasta 1. septembril. Meie põhivaldkondadeks on ilukirjandus, ajaloo- ja teatmekirjandus, elulood, laste- ja noortekirjandus, terviseraamatud ning huumor.",
      "2000. aastal kirjastas Tänapäev 45 raamatut, 2001. aastal 60, 2005. aastal 92 ja 2011. aastal 125. Kahekümne tegevusaasta jooksul ilmus kirjastuselt rohkem kui 2200 raamatut.",
      "Tõlgitud ilukirjandus ilmub meie suurimas sarjas „Punane raamat“, mis koondab tunnustatud kirjanikke nagu Kurt Vonnegut, Albert Camus, Franz Kafka, Paul Auster, Günter Grass, Ian McEwan, John Irving, Mihhail Bulgakov, Mario Vargas Llosa, Ljudmila Ulitskaja ja Sergei Dovlatov. Uute tõlgete kõrval ilmub ka populaarse klassika kordustrükke.",
      "Tänapäev avaldab mitmeid kriminaalromaanide sarju. Aimekirjanduses on rõhk kvaliteetsetel ajaloo- ja teatmeraamatutel, mis käsitlevad nii uuemat aega kui ka kaugemaid ajalooperioode.",
      "Tänapäev on üldkirjastus: avaldame raamatuid peaaegu kõikides teemades, kuid ei tegele õppekirjandusega. Aastate jooksul on meil olnud menukaid raamatuid väga erinevatel teemadel.",
      "Oleme üks suuremaid Eesti algupärase lastekirjanduse kirjastajaid. Koos Eesti Lastekirjanduse Keskusega korraldame laste- ja noorsooromaanide konkursse ning Tänapäeva romaanivõistlust.",
      "Tänapäev on tuntud vanade fotode ja postkaartide põhjal koostatud pildialbumite, loomingutegelaste biograafiate ja mälestuste kirjastajana.",
      "Umbes kaks kolmandikku meie raamatutest on tõlked. Kõige rohkem tõlgime inglise keelest, järgnevad vene, saksa, rootsi, soome, prantsuse ja norra keel.",
    ],
    manuscript: "Kui soovite meile esitada käsikirja, saatke kogu käsikiri võimalusel ühes failis koos lühikese kokkuvõttega meie üldmeilile.",
    logoTitle: "Tänapäeva logost",
    logoText: "Tänapäeva logo on detail praeguse Iraagi alalt Samarrast leitud kausilt. Arvatavasti pärineb see ajast 5000 eKr ning kujutab skorpionijumalannat. Logo autor on Tõnu Kaalep, kes leidis kujutise Vojtech Zamarovsky raamatust „Alguses oli Sumer“.",
  },
  en: {
    title: "Publishing House", subtitle: "Get to know us — our people, contacts and story.", team: "Editorial Team", company: "Tänapäev Ltd", retailers: "Wholesale & Retailers", about: "About the Publishing House",
    paragraphs: [
      "Tänapäev Publishers started operating on 1 September 1999. Our main areas are fiction, history and reference books, biographies, children’s and young adult books, health, and humour.",
      "Tänapäev published 45 books in 2000, 60 in 2001, 92 in 2005 and 125 in 2011. More than 2,200 books were released during the company’s first twenty years.",
      "Translated fiction appears in our largest series, Punane raamat (The Red Book), which brings together acclaimed authors including Kurt Vonnegut, Albert Camus, Franz Kafka, Paul Auster, Günter Grass and Ian McEwan.",
      "We publish several crime-fiction series. Our non-fiction programme focuses on high-quality history and reference works covering both recent and distant periods.",
      "Tänapäev is a general-interest publisher. We publish books in almost every subject area, although we do not produce textbooks.",
      "For years Tänapäev has been one of the largest publishers of original Estonian children’s literature and organises children’s, young-adult and novel competitions.",
      "We are also known for albums based on historical photographs and postcards, biographies, and memoirs.",
      "Roughly two thirds of our books are translations, primarily from English, followed by Russian, German, Swedish, Finnish, French and Norwegian.",
    ],
    manuscript: "To submit a manuscript, email the complete text in one file together with a short summary to our general address.",
    logoTitle: "About the Tänapäev logo",
    logoText: "The Tänapäev logo is based on a detail from a bowl found in Samarra, in present-day Iraq. It is thought to date from around 5000 BCE and depicts a scorpion goddess. The logo was designed by Tõnu Kaalep.",
  },
} as const;

export function generateStaticParams() { return [{ locale: "et" }, { locale: "en" }]; }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = (await params).locale as "et" | "en";
  if (!(locale in content)) return {};
  return { title: content[locale].title, description: content[locale].subtitle, alternates: { canonical: `/${locale}/kirjastus`, languages: { et: "/et/kirjastus", en: "/en/kirjastus" } } };
}

export default async function PublisherPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  if (locale !== "et" && locale !== "en") notFound();
  const t = content[locale];
  return <LayoutFull>
    <section className="py-[50px] border-b border-line"><Shell>
      <Breadcrumbs crumbs={[{ label: locale === "et" ? "Esileht" : "Home", href: "/" }, { label: t.title }]} />
      <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">{t.title}</h1>
      <p className="max-w-[620px] mt-4 text-muted">{t.subtitle}</p>
    </Shell></section>

    <Shell><div className="grid grid-cols-[1fr_1.2fr] gap-12 py-12 max-[900px]:grid-cols-1">
      <div className="grid gap-8 content-start">
        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">{t.team}</h2>
          <div className="grid gap-[14px]">{staff.map((person) => <article key={person.email} className="py-[10px]">
            <h3 className="text-[17px]">{person.name}</h3>
            <p className="inline-block mt-[3px] text-[13px] font-bold text-accent uppercase tracking-[.04em]">{person[locale]}</p>
            <p className="mt-[6px] text-sm text-muted">{person.phone} · <a href={`mailto:${person.email}`} className="text-accent font-bold hover:text-accent-dark">{person.email}</a></p>
          </article>)}</div>
        </section>

        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">{t.company}</h2>
          <div className="text-sm text-muted leading-[1.7]"><p>Pärnu mnt 20, Tallinn 10141</p><p>{locale === "et" ? "Tel" : "Phone"}: +372 6691 890</p><p>{locale === "et" ? "Faks" : "Fax"}: +372 6691 891</p><p>{locale === "et" ? "E-post" : "Email"}: <a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a></p></div>
          <div className="mt-4 border border-line overflow-hidden"><iframe src="https://www.google.com/maps?q=P%C3%A4rnu%20mnt%2020%2C%20Tallinn&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Tänapäev asukoht" className="block w-full h-[340px] border-0" /></div>
        </section>

        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">{t.retailers}</h2>
          <div className="grid gap-4">{retailers.map((retailer) => <article key={retailer.name} className="py-[10px]"><h3 className="text-base"><a href={retailer.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark">{retailer.name}</a></h3><p className="mt-1 whitespace-pre-line text-[13px] leading-[1.6] text-muted">{retailer[locale]}</p></article>)}</div>
        </section>
      </div>

      <section><h2 className="text-[28px] pb-[10px] mb-5 border-b border-line">{t.about}</h2>
        <div className="text-[15px] leading-[1.75] text-[#3d444a] space-y-4">{t.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p>{t.manuscript} <a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a>.</p></div>
        <div className="mt-8 grid grid-cols-[1fr_auto] gap-6 p-6 bg-soft border border-line text-[13px] text-muted leading-[1.7] items-start max-[560px]:grid-cols-1">
          <div><h3 className="text-[15px] text-ink mb-[6px]">{t.logoTitle}</h3><p>{t.logoText}</p></div>
          <div className="grid gap-[14px] max-[560px]:grid-cols-2"><img src="/logo-round.jpg" alt="Tänapäeva logo" className="w-[120px] border border-line" /><img src="/tibi-tallerk.jpg" alt="Tibi tallerk" className="w-[120px] border border-line" /></div>
        </div>
      </section>
    </div></Shell>
    <NewsletterSection />
  </LayoutFull>;
}
