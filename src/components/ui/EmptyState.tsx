export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="col-span-full p-[60px] border border-dashed border-line text-center text-muted">
      {message || "Ühtegi raamatut ei leitud."}
    </div>
  );
}
