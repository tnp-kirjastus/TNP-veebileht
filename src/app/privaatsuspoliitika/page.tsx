import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = { title: "Privaatsuspoliitika" };

export default function PrivacyPage() {
  return <Shell><article className="prose prose-lg max-w-3xl py-14">
    <h1>Privaatsuspoliitika</h1>
    <p>Isikuandmete vastutav töötleja on Tänapäev AS. Töötleme tellimuse täitmiseks nime, kontaktandmeid, tarneaadressi ning tellimuse ja makse tehnilisi andmeid.</p>
    <h2>Eesmärgid ja säilitamine</h2><p>Andmeid kasutatakse lepingu täitmiseks, klienditoeks, raamatupidamiseks ja turvalisuse tagamiseks. Säilitustähtajad lähtuvad eesmärgist ning seadusest.</p>
    <h2>Teenusepakkujad</h2><p>Vajalikud andmed võivad jõuda makse-, tarne-, majutus- ja e-posti teenusepakkujateni ainult teenuse osutamiseks vajalikus ulatuses.</p>
    <h2>Uudiskiri</h2><p>Uudiskirja saadame ainult kinnitatud nõusolekul. Nõusoleku saab igal ajal kirjas oleva loobumislingi kaudu tagasi võtta.</p>
    <h2>Sinu õigused</h2><p>Sul on õigus taotleda ligipääsu, parandamist, kustutamist või töötlemise piiramist ning esitada vastuväide või kaebus Andmekaitse Inspektsioonile. Kirjuta <a href="mailto:tnp@tnp.ee">tnp@tnp.ee</a>.</p>
  </article></Shell>;
}
