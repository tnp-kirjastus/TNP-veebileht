"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { logout } from "@/app/haldus/actions";
import { ToastProvider } from "./Toast";

const links = [
  { label: "Ülevaade", href: "/haldus", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { label: "Tooted", href: "/haldus/tooted", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { label: "Tellimused", href: "/haldus/tellimused", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Blogi / Uudised", href: "/haldus/blogi", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
  { label: "Kampaaniad", href: "/haldus/kampaaniad", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" },
  { label: "Kategooriad", href: "/haldus/kategooriad", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { label: "Sarjad", href: "/haldus/sarjad", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { label: "Autorid", href: "/haldus/autorid", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { label: "Avaleht", href: "/haldus/avaleht", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { label: "Kliendid", href: "/haldus/kliendid", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Kasutajad", href: "/haldus/kasutajad", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { label: "Import", href: "/haldus/import", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
  { label: "Seaded", href: "/haldus/seaded", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
] as const;

export function AdminShell({ children, role, email }: { children: ReactNode; role: string; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-paper text-ink grid grid-cols-[250px_1fr] max-[860px]:grid-cols-1">
        <button
          className="fixed top-4 left-4 z-50 p-2 bg-ink text-white hidden max-[860px]:flex items-center gap-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Sule menüü" : "Ava menüü"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        {mobileOpen && <div className="fixed inset-0 z-30 bg-ink/50 hidden max-[860px]:block" onClick={() => setMobileOpen(false)} />}

        <aside className={clsx(
          "border-r border-line bg-ink text-white p-6 overflow-y-auto",
          "max-[860px]:fixed max-[860px]:inset-y-0 max-[860px]:left-0 max-[860px]:z-40 max-[860px]:w-72 max-[860px]:transition-transform",
          mobileOpen ? "max-[860px]:translate-x-0" : "max-[860px]:-translate-x-full"
        )}>
          <Link href="/haldus" className="font-heading text-2xl" onClick={() => setMobileOpen(false)}>Tänapäev Haldus</Link>
          <p className="mt-2 text-xs text-white/60 break-all">{email} &middot; {role}</p>
          <nav className="grid gap-0.5 mt-6" aria-label="Haldusmenüü">
            {links.map(({ label, href, icon }) => {
              const active = pathname === href || (href !== "/haldus" && pathname.startsWith(href + "/")) || (href === "/haldus" && pathname === "/haldus");
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 font-bold text-sm transition-colors",
                    active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
                  {label}
                </Link>
              );
            })}
          </nav>
          <form action={logout} className="mt-8"><button className="px-3 py-2 border border-white/30 text-sm font-bold hover:bg-white/10 w-full text-left">Logi välja</button></form>
        </aside>
        <div className="min-w-0">
          <header className="min-h-16 border-b border-line bg-panel flex items-center justify-between px-8 max-sm:px-4 max-[860px]:pl-16">
            <span className="text-sm font-bold text-muted">Sisuhaldus ja veebipood</span>
            <Link href="/" className="text-sm font-bold text-accent">Vaata veebipoodi →</Link>
          </header>
          <main id="main-content" className="p-8 max-sm:p-4">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
