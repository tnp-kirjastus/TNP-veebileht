"use client";

import { type ReactNode } from "react";

export function SearchFilter({
  searchPlaceholder = "Otsi…",
  searchValue,
  onSearchChange,
  filters,
  onSearch,
  action,
}: {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
  onSearch?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 max-sm:flex-col max-sm:items-stretch">
      <div className="flex items-center gap-0 flex-1 min-w-0 max-sm:w-full">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-0 h-11 border border-line border-r-0 bg-panel px-4 outline-none text-sm max-sm:border-r max-sm:border-line"
          onKeyDown={(e) => { if (e.key === "Enter") onSearch?.(); }}
        />
        <button type="button" onClick={onSearch} className="h-11 px-5 border border-line bg-soft text-sm font-bold hover:bg-line/30 max-sm:hidden">
          Otsi
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap max-sm:w-full">
        {filters}
        {action}
      </div>
    </div>
  );
}
