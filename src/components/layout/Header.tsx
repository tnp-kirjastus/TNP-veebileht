"use client";
/* Brand artwork has a non-standard transparent canvas retained from the approved asset. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Shell } from "./Shell";
import { MobileNav } from "./MobileNav";
import { useCart } from "@/lib/cart-context";
import { useCartDrawer } from "@/lib/cart-drawer-context";
import { useAuth } from "@/lib/auth-context";
import { useProfileDrawer } from "@/lib/profile-drawer-context";
import { LanguageToggle } from "./LanguageToggle";
import { isPublicNavActive, PUBLIC_NAV_ITEMS } from "@/lib/navigation";

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { itemCount } = useCart();
  const { open: openCart } = useCartDrawer();
  const { user, loading } = useAuth();
  const { open: openProfile } = useProfileDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/raamatud?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-paper/[.92] border-b border-ink/[.1] backdrop-blur-[18px]">
        <Shell>
          <div className="min-h-[84px] grid grid-cols-[auto_1fr_auto] items-center gap-[26px] max-[760px]:min-h-[70px] max-[760px]:gap-[12px]">
            <Link href="/" className="w-[174px] inline-flex items-center max-[760px]:w-[142px]">
              <img src="/tanapaeva-logo.png" alt="Tänapäev" className="w-full" />
            </Link>

            <form onSubmit={handleSearch} className="w-full max-w-[640px] mx-auto max-[1120px]:hidden">
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Otsi raamatut, autorit, ISBNi, kategooriat ..."
                className="w-full h-[48px] border border-line bg-panel px-5 text-sm outline-none focus:border-ink/30 transition-colors"
              />
            </form>

            <div className="flex items-center gap-[10px]">
              <LanguageToggle />
              <a href="https://facebook.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-line bg-panel grid place-items-center hover:bg-ink hover:text-white transition-colors max-[760px]:hidden"
                aria-label="Tänapäev Facebookis">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.927 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>
              </a>
              <a href="https://instagram.com/kirjastustanapaev" target="_blank" rel="noopener noreferrer"
                className="w-[36px] h-[36px] border border-line bg-panel grid place-items-center hover:bg-ink hover:text-white transition-colors max-[760px]:hidden"
                aria-label="Tänapäev Instagramis">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M17 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V7a5 5 0 0 0-5-5zm-5 15.2a5.2 5.2 0 1 1 0-10.4 5.2 5.2 0 0 1 0 10.4zm5.4-9.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>
              </a>

              {loading ? (
                <div className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center max-[760px]:hidden" />
              ) : user ? (
                <Link href="/profiil"
                  className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center max-[760px]:hidden"
                  aria-label="Konto">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
                  </svg>
                </Link>
              ) : (
                <button onClick={openProfile}
                  className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center max-[760px]:hidden hover:bg-soft"
                  aria-label="Konto">
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/>
                  </svg>
                </button>
              )}

              <button className="hidden max-[1120px]:grid w-[44px] h-[44px] border border-line bg-panel place-items-center"
                onClick={() => setMobileNavOpen(true)} aria-label="Ava menüü">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
              </button>

              <button onClick={openCart}
                className="relative w-[44px] h-[44px] border border-line bg-panel grid place-items-center"
                aria-label="Ava ostukorv">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6h15l-2 8H8L6 3H3"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-[7px] -right-[7px] min-w-[22px] h-[22px] px-[6px] grid place-items-center bg-accent text-white text-xs font-extrabold">{itemCount}</span>
                )}
              </button>
            </div>
          </div>

          <nav className="flex justify-center gap-[22px] border-t border-ink/[.06] max-[1120px]:hidden">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = isPublicNavActive(item.key, item.href, pathname);
              return (
                <Link key={item.key} href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative uppercase font-extrabold text-sm py-3 whitespace-nowrap
                    after:absolute after:left-0 after:right-0 after:bottom-[7px] after:h-[2px] after:bg-accent
                    after:scale-x-0 after:origin-right after:transition-transform after:duration-[280ms]
                    hover:after:scale-x-100 hover:after:origin-left ${active ? "text-accent after:scale-x-100" : "text-[#303437]"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </Shell>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
