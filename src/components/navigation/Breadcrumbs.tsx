"use client";


interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
      {crumbs.map((crumb, i) => (
        <span key={i}>
          {i > 0 && " / "}
          {crumb.href ? (
            <a href={crumb.href} className="hover:text-ink transition-colors">
              {crumb.label}
            </a>
          ) : (
            <span className="text-ink">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
