import { clsx } from "clsx";

const variants = {
  active: "bg-leaf/10 text-leaf",
  upcoming: "bg-amber-100 text-amber-800",
  archived: "bg-muted/10 text-muted",
  draft: "bg-muted/10 text-muted",
  published: "bg-leaf/10 text-leaf",
  scheduled: "bg-blue-100 text-blue-800",
  sale: "bg-accent/10 text-accent",
  ended: "bg-muted/10 text-muted",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-leaf/10 text-leaf",
  shipped: "bg-blue-100 text-blue-800",
  cancelled: "bg-muted/10 text-muted",
  low: "bg-accent/10 text-accent",
  out: "bg-red-100 text-red-800",
  ok: "bg-leaf/10 text-leaf",
  admin: "bg-accent/10 text-accent",
  editor: "bg-blue-100 text-blue-800",
  viewer: "bg-muted/10 text-muted",
} as const;

type Variant = keyof typeof variants;

const labels: Record<Variant, string> = {
  active: "Aktiivne",
  upcoming: "Ilmumas",
  archived: "Arhiveeritud",
  draft: "Mustand",
  published: "Avaldatud",
  scheduled: "Ajastatud",
  sale: "Soodus",
  ended: "Lõppenud",
  pending: "Ootel",
  paid: "Makstud",
  shipped: "Saadetud",
  cancelled: "Tühistatud",
  low: "Madal laoseis",
  out: "Otsas",
  ok: "Korras",
  admin: "Admin",
  editor: "Toimetaja",
  viewer: "Vaatleja",
};

export function StatusBadge({ variant, label }: { variant: Variant; label?: string }) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 text-xs font-extrabold tracking-wide", variants[variant])}>
      {label ?? labels[variant]}
    </span>
  );
}
