"use client";

import Link from "next/link";
import { isPublicNavActive, PUBLIC_NAV_ITEMS } from "@/lib/navigation";
import { usePathname } from "next/navigation";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-[rgba(21,23,24,.42)]" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-42 w-[min(360px,88vw)] bg-panel border-r border-ink p-[22px] transform -translate-x-[104%] data-[open]:translate-x-0 transition-transform duration-[280ms]" data-open={open ? "" : undefined} style={open ? { transform: "translateX(0)" } : undefined}>
        <button onClick={onClose} className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center mb-7" aria-label="Sulge menüü">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <nav className="grid gap-2 text-[22px] font-extrabold">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const active = isPublicNavActive(item.key, item.href, pathname);
            return (
            <Link key={item.key} href={item.href} onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`py-3 border-b border-line ${active ? "text-accent" : ""}`}>{item.label}</Link>
          )})}
        </nav>
      </aside>
    </>
  );
}
