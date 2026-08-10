/** Eesti täpitähtede teisendus URL-sõbralikuks slugiks — ühine kogu rakenduses. */
export function slugify(text: string): string {
  const t: Record<string, string> = { "õ": "o", "ä": "a", "ö": "o", "ü": "u", "š": "s", "ž": "z", "Õ": "O", "Ä": "A", "Ö": "O", "Ü": "U", "Š": "S", "Ž": "Z" };
  let r = String(text);
  for (const [k, v] of Object.entries(t)) r = r.replace(new RegExp(k, "g"), v);
  return r.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
