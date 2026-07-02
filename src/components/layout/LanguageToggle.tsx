"use client";

import { usePathname, useRouter } from "next/navigation";

export function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  if (!/^\/(et|en)\/(kontakt|kirjastus)(?:\/|$)/.test(pathname)) return null;
  const current = pathname.startsWith("/en/") ? "en" : "et";
  function choose(locale: "et" | "en") { router.push(pathname.replace(/^\/(et|en)/, `/${locale}`)); }
  return <div className="flex border border-line" aria-label="Language"><button type="button" aria-pressed={current === "et"} onClick={() => choose("et")} className={`min-w-10 h-9 text-xs font-extrabold ${current === "et" ? "bg-ink text-white" : "bg-panel"}`}>ET</button><button type="button" aria-pressed={current === "en"} onClick={() => choose("en")} className={`min-w-10 h-9 text-xs font-extrabold ${current === "en" ? "bg-ink text-white" : "bg-panel"}`}>EN</button></div>;
}

