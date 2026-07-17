"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/profiil", label: "Ülevaade", exact: true },
  { href: "/profiil/tellimused", label: "Tellimused", exact: false },
  { href: "/profiil/seaded", label: "Profiil", exact: false },
];

export function AccountNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <nav className="grid gap-0.5">
      {NAV.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 font-bold text-sm transition-colors ${
              active
                ? "border border-ink bg-white text-ink"
                : "text-ink hover:bg-soft"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <button
        onClick={() => signOut()}
        className="flex items-center gap-3 px-4 py-2.5 font-bold text-sm text-left text-muted hover:text-accent hover:bg-soft transition-colors"
      >
        Logi välja
      </button>
    </nav>
  );
}
