"use client";

import { t } from "@/lib/translations";
import { useEffect, useRef } from "react";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { inputRef.current?.focus(); document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={onClose} role="dialog" aria-modal="true" aria-label="Raamatute otsing">
      <div className="bg-panel w-full max-w-[640px] mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form action="/raamatud" method="GET">
          <div className="flex items-center border-b-2 border-ink">
            <input ref={inputRef} name="q" type="search" placeholder={t.search.placeholder}
              className="flex-1 min-w-0 h-[60px] px-6 text-lg bg-transparent outline-none" />
            <button type="submit"
              className="h-[60px] px-6 bg-ink text-white font-extrabold hover:bg-[#2a2d30] transition-colors">
              {t.search.button}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
