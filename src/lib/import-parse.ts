// Exceli impordi puhas parsimisloogika (eraldatud server-action'itest,
// et seda saaks ühiktestidega katta).

// Tõeväärtuse veerud (Ilmumas, Ettetellimus, Arhiiv): "x" = jah.
export function parseFlag(raw: unknown): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "x" || v === "true" || v === "yes" || v === "jah" || v === "1";
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function parseEtDate(part: string): string | null {
  const s = part.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    if (d.getUTCFullYear() === Number(m[3]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[1])) {
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // Excel'i kuupäevaseriaal (lahter kuupäevavormingus)
  if (/^\d{5}$/.test(s)) {
    const serial = Number(s);
    if (serial >= 20000 && serial <= 60000) {
      return new Date(EXCEL_EPOCH + serial * 86_400_000).toISOString().slice(0, 10);
    }
  }
  return null;
}

// "Toote Ilmumiskuupäev" võib olla |-eraldatud trükiloend (esmatrükk +
// kordustrükid) — release_date on alati esmatrüki (varaseim) kuupäev.
// Kordustrükid elavad eraldi editions-väljal, mida import ei puuduta.
export function parseReleaseDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const dates = String(raw).split("|").map(parseEtDate).filter((d): d is string => d !== null);
  return dates.sort()[0] ?? null;
}
