import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = { title: "Kasutustingimused" };

export default function TermsPage() {
  return <Shell><article className="prose prose-lg max-w-3xl py-14">
    <h1>Kasutustingimused</h1>
    <p>Veebipoe müüja on Tänapäev AS. Tingimused kehtivad veebipoest kaupade ostmisel.</p>
    <h2>Tellimine ja hinnad</h2><p>Hinnad on eurodes ja sisaldavad käibemaksu. Tellimus muutub siduvaks pärast makse kinnitamist. Kui toodet ei ole võimalik tarnida, võtame ostjaga ühendust ja tagastame tasutud summa.</p>
    <h2>Tarne</h2><p>Tarneviis ja võimalik tarnekulu kuvatakse kassas enne maksmist. Ettetellitavad tooted saadetakse pärast ilmumist.</p>
    <h2>Taganemine ja pretensioonid</h2><p>Tarbijal on seaduses sätestatud juhtudel õigus lepingust 14 päeva jooksul taganeda. Palun kirjuta aadressil <a href="mailto:tnp@tnp.ee">tnp@tnp.ee</a>. Puudusega kauba korral vastutab müüja seaduses ettenähtud korras.</p>
    <h2>Vaidlused</h2><p>Vaidlused lahendatakse läbirääkimiste teel või Eesti Vabariigi õigusaktides sätestatud korras.</p>
  </article></Shell>;
}
