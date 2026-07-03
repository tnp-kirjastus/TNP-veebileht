export function AdminEmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 border border-dashed border-line text-center text-muted rounded">
      <p className="font-heading text-lg mb-4">{message}</p>
      {action}
    </div>
  );
}

export function AdminSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-line bg-panel overflow-hidden">
      <div className="animate-pulse">
        <div className="grid grid-cols-12 gap-4 p-4 bg-soft border-b border-line">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-muted/20 col-span-2" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid grid-cols-12 gap-4 p-4 border-b border-line">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3 bg-muted/10 col-span-2" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
