import { t } from "@/lib/translations";
import Link from "next/link";
import Image from "next/image";
import { Shell } from "./Shell";

export function Footer() {
  return (
    <footer className="bg-ink text-white py-[46px] pb-8 mt-0">
      <Shell>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-[30px] max-[640px]:grid-cols-1">
          <div>
            <Image src="/tanapaeva-logo.png" alt="Tänapäev" width={160} height={71}
              className="w-[160px] h-auto brightness-0 invert opacity-90" />
            <p className="mt-4 text-white/70 max-w-[430px] leading-relaxed">
              {t.footer.tagline}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/kasutustingimused" className="font-bold text-white/[.78] hover:text-white transition-colors">{t.footer.terms}</Link>
            <Link href="/privaatsuspoliitika" className="font-bold text-white/[.78] hover:text-white transition-colors">{t.footer.privacy}</Link>
            <Link href="/kirjastus" className="font-bold text-white/[.78] hover:text-white transition-colors">{t.footer.publisher}</Link>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-white/[.78]"><a href="mailto:info@tanapaev.ee" className="hover:text-white">info@tanapaev.ee</a></p>
            <p className="text-white/[.78]">Tellimused üle Eesti</p>
            <div className="flex gap-[10px] mt-[14px]">
              <a href="https://facebook.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-white/[.28] grid place-items-center text-white hover:bg-white/[.14] transition-colors" aria-label="Facebook">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.927 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>
              </a>
              <a href="https://instagram.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-white/[.28] grid place-items-center text-white hover:bg-white/[.14] transition-colors" aria-label="Instagram">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zm-5 15.2a5.2 5.2 0 1 1 0-10.4 5.2 5.2 0 0 1 0 10.4zm5.4-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </Shell>
    </footer>
  );
}
