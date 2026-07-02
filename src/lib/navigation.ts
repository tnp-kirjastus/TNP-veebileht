export const PUBLIC_NAV_ITEMS = [
  { key: "uudised", label: "Uudised", href: "/uudised" },
  { key: "uued_raamatud", label: "Uued raamatud", href: "/#uued" },
  { key: "raamatud", label: "Raamatud", href: "/raamatud" },
  { key: "sarjad", label: "Sarjad", href: "/sarjad" },
  { key: "pakkumised", label: "Pakkumised", href: "/pakkumised" },
  { key: "arhiiv", label: "Läbimüüdud", href: "/arhiiv" },
  { key: "kirjastus", label: "Kirjastus", href: "/kirjastus" },
] as const;

export function isPublicNavActive(key: typeof PUBLIC_NAV_ITEMS[number]["key"], href: string, pathname: string) {
  if (href.startsWith("/#")) return false;
  if (key === "uudised" && pathname.startsWith("/uudis/")) return true;
  if (key === "raamatud" && pathname.startsWith("/raamat/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
