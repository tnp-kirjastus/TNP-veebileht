"use client";

import { usePathname, useRouter } from "next/navigation";

export function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  if (!/^\/(et|en)\/(kontakt|kirjastus)(?:\/|$)/.test(pathname)) return null;
  const current = pathname.startsWith("/en/") ? "en" : "et";
  function choose(locale: "et" | "en") { router.push(pathname.replace(/^\/(et|en)/, `/${locale}`)); }
  return <div className="flex border border-line" aria-label="Language"><button type="button" aria-pressed={current === "et"} onClick={() => choose("et")} className={`min-w-10 h-9 text-xs font-extrabold border ${current === "et" ? "border-ink bg-white text-ink" : "border-line bg-panel"}`}>ET</button><button type="button" aria-pressed={current === "en"} onClick={() => choose("en")} className={`min-w-10 h-9 text-xs font-extrabold border ${current === "en" ? "border-ink bg-white text-ink" : "border-line bg-panel"}`}>EN</button></div>;
}

