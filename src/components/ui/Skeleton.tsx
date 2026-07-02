export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-soft rounded ${className}`}
      aria-hidden="true"
    />
  );
}
