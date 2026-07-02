"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`/raamatud?${params.toString()}`);
  }

  return (
    <select
      value={currentSort}
      onChange={(e) => handleChange(e.target.value)}
      className="h-[46px] min-w-[240px] px-[14px] pr-[42px] border border-line bg-panel max-[640px]:w-full"
    >
      <option value="newest">Järjesta uuemad enne</option>
      <option value="oldest">Järjesta vanemad enne</option>
      <option value="price-asc">Hinna järgi kasvavalt</option>
      <option value="price-desc">Hinna järgi kahanevalt</option>
      <option value="az">Järjesta A-Z</option>
      <option value="za">Järjesta Z-A</option>
    </select>
  );
}
