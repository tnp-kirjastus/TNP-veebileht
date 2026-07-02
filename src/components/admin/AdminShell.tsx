import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/haldus/actions";

const links = [
  ["Ülevaade", "/haldus"],
  ["Tooted", "/haldus/tooted"],
  ["Tellimused", "/haldus/tellimused"],
  ["Blogi / Uudised", "/haldus/blogi"],
  ["Kampaaniad", "/haldus/kampaaniad"],
  ["Sarjad", "/haldus/sarjad"],
  ["Kategooriad", "/haldus/kategooriad"],
  ["Inimesed", "/haldus/inimesed"],
  ["Import", "/haldus/import"],
  ["Audit", "/haldus/audit"],
] as const;

export function AdminShell({ children, role, email }: { children: ReactNode; role: string; email: string }) {
  return (
    <div className="min-h-screen bg-paper text-ink grid grid-cols-[250px_1fr] max-[860px]:grid-cols-1">
      <aside className="border-r border-line bg-ink text-white p-6 max-[860px]:border-r-0">
        <Link href="/haldus" className="font-heading text-2xl">Tänapäev Haldus</Link>
        <p className="mt-2 text-xs text-white/60 break-all">{email} · {role}</p>
        <nav className="grid gap-1 mt-8" aria-label="Haldusmenüü">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="px-3 py-2.5 font-bold text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-8"><button className="px-3 py-2 border border-white/30 text-sm font-bold hover:bg-white/10">Logi välja</button></form>
      </aside>
      <div className="min-w-0">
        <header className="min-h-16 border-b border-line bg-panel flex items-center justify-between px-8 max-sm:px-4">
          <span className="text-sm font-bold text-muted">Sisuhaldus ja veebipood</span>
          <Link href="/" className="text-sm font-bold text-accent">Vaata veebipoodi →</Link>
        </header>
        <main id="main-content" className="p-8 max-sm:p-4">{children}</main>
      </div>
    </div>
  );
}
