import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted mb-3" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted/40">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-ink transition-colors">{crumb.label}</a>
              ) : (
                <span className="font-bold text-ink">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-4xl">{title}</h1>
          {description && <p className="text-muted mt-2">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
