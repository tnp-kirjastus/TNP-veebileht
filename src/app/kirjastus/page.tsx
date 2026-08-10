/* The approved v5 publisher layout uses a fixed map embed and historical logo images. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { LayoutFull, Shell } from "@/components/layout";
// Breadcrumbs removed per client request (task 17)
import { NewsletterSection } from "@/components/store/NewsletterSection";

const staff = [
  { name: "Tauno Vahter", role: "Peatoimetaja", phone: "+372 6691 894", email: "tauno@tnp.ee" },
  { name: "Mihkel Mõisnik", role: "Toimetaja", phone: "+372 6691 892", email: "mihkel@tnp.ee" },
  { name: "Mari Karlson", role: "Toimetaja", phone: "+372 6691 896", email: "mari@tnp.ee" },
  { name: "Priit Põhjala", role: "Toimetaja", phone: "+372 6691 895", email: "priit@tnp.ee" },
  { name: "Sash Veelma", role: "Toimetaja", phone: "+372 6691 893", email: "sash@tnp.ee" },
  { name: "Kristi Martin", role: "Müügi- ja turundusjuht", phone: "+372 6691 890", email: "kristi@tnp.ee" },
];

const retailers = [
  { name: "Rahva Raamat", href: "https://www.rahvaraamat.ee", address: "Telliskivi 60/2 (I-hoone), 15073 Tallinn" },
  { name: "Apollo Raamatud", href: "https://www.apollo.ee", address: "Tartu mnt 80d, 10112 Tallinn" },
  { name: "Raamatukoi", href: "https://www.raamatukoi.ee", address: "Harju 1, 10146 Tallinn" },
];

const paragraphs = [
  "Kirjastus Tänapäev alustas tööd 1999. aasta 1. septembril. Meie põhivaldkondadeks on ilukirjandus, ajaloo- ja teatmekirjandus, elulood, laste- ja noortekirjandus, terviseraamatud ning huumor.",
  "2000. aastal kirjastas Tänapäev 45 raamatut, 2001. aastal 60, 2005. aastal 92 ja 2011. aastal 125. Kahekümne tegevusaasta jooksul ilmus kirjastuselt rohkem kui 2200 raamatut.",
  "Tõlgitud ilukirjandus ilmub meie suurimas sarjas „Punane raamat“, mis koondab tunnustatud kirjanikke nagu Kurt Vonnegut, Albert Camus, Franz Kafka, Paul Auster, Günter Grass, Ian McEwan, John Irving, Mihhail Bulgakov, Mario Vargas Llosa, Ljudmila Ulitskaja ja Sergei Dovlatov. Uute tõlgete kõrval ilmub ka populaarse klassika kordustrükke.",
  "Tänapäev avaldab mitmeid kriminaalromaanide sarju. Aimekirjanduses on rõhk kvaliteetsetel ajaloo- ja teatmeraamatutel, mis käsitlevad nii uuemat aega kui ka kaugemaid ajalooperioode.",
  "Tänapäev on üldkirjastus: avaldame raamatuid peaaegu kõikides teemades, kuid ei tegele õppekirjandusega. Aastate jooksul on meil olnud menukaid raamatuid väga erinevatel teemadel.",
  "Oleme üks suuremaid Eesti algupärase lastekirjanduse kirjastajaid. Koos Eesti Lastekirjanduse Keskusega korraldame laste- ja noorsooromaanide konkursse ning Tänapäeva romaanivõistlust.",
  "Tänapäev on tuntud vanade fotode ja postkaartide põhjal koostatud pildialbumite, loomingutegelaste biograafiate ja mälestuste kirjastajana.",
  "Umbes kaks kolmandikku meie raamatutest on tõlked. Kõige rohkem tõlgime inglise keelest, järgnevad vene, saksa, rootsi, soome, prantsuse ja norra keel.",
];

export const metadata: Metadata = {
  title: "Kirjastus",
  description: "Saame tuttavaks — meie inimesed, kontaktandmed ja lugu.",
  alternates: { canonical: "/kirjastus" },
};

export default function PublisherPage() {
  return <LayoutFull>
    <section className="py-[28px]"><Shell>
      <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none">Kirjastus</h1>
    </Shell></section>

    <Shell><div className="grid grid-cols-[1fr_1.2fr] gap-12 py-12 max-[900px]:grid-cols-1">
      <div className="grid gap-8 content-start">
        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">Toimetus</h2>
          <div className="grid gap-[14px]">{staff.map((person) => <article key={person.email} className="py-[10px]">
            <h3 className="text-[17px]">{person.name}</h3>
            <p className="inline-block mt-[3px] text-[13px] font-bold text-accent uppercase tracking-[.04em]">{person.role}</p>
            <p className="mt-[6px] text-sm text-muted">{person.phone} · <a href={`mailto:${person.email}`} className="text-accent font-bold hover:text-accent-dark">{person.email}</a></p>
          </article>)}</div>
        </section>

        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">AS Tänapäev</h2>
          <div className="text-sm text-muted leading-[1.7]"><p>Pärnu mnt 20, Tallinn 10141</p><p>Tel: +372 6691 890</p><p>Faks: +372 6691 891</p><p>E-post: <a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a></p></div>
          <div className="mt-4 border border-line overflow-hidden"><iframe src="https://www.google.com/maps?q=P%C3%A4rnu%20mnt%2020%2C%20Tallinn&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Tänapäev asukoht" className="block w-full h-[340px] border-0" /></div>
        </section>

        <section><h2 className="text-[22px] pb-[10px] mb-4 border-b border-line">Hulgimüük ja edasimüüjad</h2>
          <div className="grid gap-4">{retailers.map((retailer) => <article key={retailer.name} className="py-[10px]"><h3 className="text-base"><a href={retailer.href} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark">{retailer.name}</a></h3><p className="mt-1 whitespace-pre-line text-[13px] leading-[1.6] text-muted">{retailer.address}</p></article>)}</div>
        </section>
      </div>

      <section><h2 className="text-[28px] pb-[10px] mb-5 border-b border-line">Kirjastusest</h2>
        <div className="text-[15px] leading-[1.75] text-[#3d444a] space-y-4">{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p>Kui soovite meile esitada käsikirja, saatke kogu käsikiri võimalusel ühes failis koos lühikese kokkuvõttega meie üldmeilile. <a href="mailto:tnp@tnp.ee" className="text-accent font-bold">tnp@tnp.ee</a>.</p></div>
        <div className="mt-8 grid grid-cols-[1fr_auto] gap-6 p-6 bg-soft border border-line text-[13px] text-muted leading-[1.7] items-start max-[560px]:grid-cols-1">
          <div><h3 className="text-[15px] text-ink mb-[6px]">Tänapäeva logost</h3><p>Tänapäeva logo on detail praeguse Iraagi alalt Samarrast leitud kausilt. Arvatavasti pärineb see ajast 5000 eKr ning kujutab skorpionijumalannat. Logo autor on Tõnu Kaalep, kes leidis kujutise Vojtech Zamarovsky raamatust „Alguses oli Sumer“.</p></div>
          <div className="grid gap-[14px] max-[560px]:grid-cols-2"><img src="/logo-round.jpg" alt="Tänapäeva logo" className="w-[120px] border border-line" /><img src="/tibi-tallerk.jpg" alt="Tibi tallerk" className="w-[120px] border border-line" /></div>
        </div>
      </section>
    </div></Shell>
    <NewsletterSection />
  </LayoutFull>;
}
