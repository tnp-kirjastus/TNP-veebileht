"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Category { id: string; slug: string; name_et: string; children?: Category[]; }

const QUICK_FILTERS = [
  { key: "all" },
  { key: "new", param: "sort", value: "newest" },
  { key: "estonian", param: "origin", value: "estonian" },
  { key: "foreign", param: "origin", value: "foreign" },
  { key: "sale", param: "sale", value: "true" },
  { key: "upcoming", param: "upcoming", value: "true" },
] as const;

const QUICK_LABELS: Record<string, string> = {
  all: "Näita kõiki", new: "Uued raamatud", estonian: "Eesti autorid", foreign: "Välismaa autorid", sale: "Soodus", upcoming: "Ilmumas",
};

export function FilterSidebar({ categories, activeCategory, currentParams }: {
  categories: Category[]; activeCategory?: string; currentParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const openButton = openButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      openButton?.focus();
    };
  }, [isOpen]);

  function buildUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...currentParams, ...updates };
    Object.entries(merged).forEach(([k, v]) => { if (typeof v === "string") params.set(k, v); });
    params.delete("page");
    return `/raamatud?${params.toString()}`;
  }

  function toggleQuickFilter(f: (typeof QUICK_FILTERS)[number]) {
    if (f.key === "all") { router.push("/raamatud"); return; }
    const cur = currentParams[f.param!];
    router.push(typeof cur === "string" && cur === f.value ? buildUrl({ [f.param!]: undefined }) : buildUrl({ [f.param!]: f.value }));
  }

  function isQuickActive(f: (typeof QUICK_FILTERS)[number]) {
    if (f.key === "all") return !currentParams.origin && !currentParams.sale && !currentParams.upcoming && !activeCategory && (!currentParams.sort || currentParams.sort === "newest");
    return f.param ? currentParams[f.param] === f.value : false;
  }

  return (
    <>
      <button ref={openButtonRef} className="hidden max-[880px]:inline-flex items-center gap-[8px] h-[44px] px-[15px] border border-ink bg-panel font-bold"
        aria-expanded={isOpen} aria-controls="catalogue-filters"
        onClick={() => setIsOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        Filtrid
      </button>

      {isOpen && <button type="button" aria-label="Sulge filtrid" className="fixed inset-0 z-35 bg-[rgba(0,0,0,.42)] max-[880px]:block hidden" onClick={() => setIsOpen(false)} />}

      <aside ref={drawerRef} id="catalogue-filters" className={`sticky top-[116px] self-start pr-[26px] bg-[#fffaf3] p-5
        max-[880px]:fixed max-[880px]:z-40 max-[880px]:inset-y-0 max-[880px]:left-0
        max-[880px]:w-[min(88vw,340px)] max-[880px]:bg-paper max-[880px]:border-0 max-[880px]:overflow-auto
        ${isOpen ? "max-[880px]:translate-x-0 max-[880px]:visible" : "max-[880px]:-translate-x-[105%] max-[880px]:invisible"} max-[880px]:transition-transform max-[880px]:duration-[250ms] max-[880px]:p-6`}>
        <div className="flex justify-between items-center mb-[18px]">
          <h2 className="text-xl font-heading">Filtrid</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { router.push("/raamatud"); if (isOpen) setIsOpen(false); }} className="bg-transparent text-accent font-bold text-[13px]">Tühista</button>
            <button onClick={() => setIsOpen(false)} className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center hidden max-[880px]:grid" aria-label="Sulge filtrid">×</button>
          </div>
        </div>

        <div className="grid gap-[4px] mb-[22px] pb-[22px] border-b border-line">
          {QUICK_FILTERS.map((f) => {
            const active = isQuickActive(f);
            return (
              <button key={f.key} onClick={() => toggleQuickFilter(f)}
                aria-pressed={active}
                className={`flex items-center gap-[10px] p-[8px_6px] bg-transparent text-left font-bold cursor-pointer hover:bg-soft transition-colors text-[#333] ${active ? "" : ""}`}>
                <span className={`w-[18px] h-[18px] border grid place-items-center flex-shrink-0 ${active ? "bg-ink border-ink" : "border-[#8e969b]"}`}>
                  {active && <span className="w-[9px] h-[5px] border-l-[2px] border-b-[2px] border-white -rotate-45 -translate-y-px" />}
                </span>
                {QUICK_LABELS[f.key]}
              </button>
            );
          })}
        </div>

        {categories.map((cat) => (
          <CategoryTreeGroup key={cat.id} category={cat} activeCategory={activeCategory}
            onSelect={(slug) => router.push(buildUrl({ category: slug }))} />
        ))}
      </aside>
    </>
  );
}

function CategoryTreeGroup({ category, activeCategory, onSelect }: {
  category: Category; activeCategory?: string; onSelect: (s: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(activeCategory === category.slug
    || category.children?.some(c => c.slug === activeCategory));

  const hasChildren = !!category.children?.length;

  return (
    <div className="border-b border-line">
      <button onClick={() => { if (hasChildren) setIsOpen(!isOpen); else onSelect(category.slug); }}
        aria-expanded={hasChildren ? isOpen : undefined} aria-current={activeCategory === category.slug ? "page" : undefined}
        className={`w-full py-[15px] px-1 flex justify-between text-left font-extrabold bg-transparent cursor-pointer hover:text-accent ${activeCategory === category.slug ? "text-accent" : ""}`}>
        {category.name_et}{hasChildren && <span>{isOpen ? "−" : "+"}</span>}
      </button>
      {isOpen && hasChildren && (
        <div className="pb-3 pl-3 grid">
          {category.children!.map(child => (
            <button key={child.id} onClick={() => onSelect(child.slug)}
              aria-current={activeCategory === child.slug ? "page" : undefined}
              className={`w-full py-[7px] px-2 text-left bg-transparent cursor-pointer transition-colors
                ${activeCategory === child.slug ? "text-ink font-bold bg-soft" : "text-muted hover:text-ink hover:font-bold hover:bg-soft"}`}>
              {child.name_et}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
