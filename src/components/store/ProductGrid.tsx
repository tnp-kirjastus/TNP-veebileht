import { ProductCard, type ProductCardData } from "./ProductCard";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";

export function ProductGrid({
  products,
  columns = 4,
  emptyMessage,
  loading,
  variant,
}: {
  products: ProductCardData[];
  columns?: 4 | 5;
  emptyMessage?: string;
  loading?: boolean;
  variant?: "home" | "listing";
}) {
  if (loading) {
    return (
      <div
        className={`grid gap-y-[28px] max-[1120px]:grid-cols-3 max-[640px]:grid-cols-2
          ${columns === 5
            ? "grid-cols-5 gap-[18px]"
            : "grid-cols-4 gap-x-[18px]"
          }`}
      >
        {Array.from({ length: columns === 5 ? 10 : 8 }).map((_, i) => (
          <div key={i} className="py-[40px] px-5">
            <Skeleton className="aspect-[3/4] w-[75%] mx-auto" />
            <Skeleton className="h-[22px] w-3/4 mt-6" />
            <Skeleton className="h-[16px] w-1/2 mt-2" />
            <Skeleton className="h-[20px] w-1/3 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div
      className={`grid gap-y-[28px] max-[1120px]:grid-cols-3 max-[640px]:grid-cols-2
        ${columns === 5
          ? "grid-cols-5 gap-[18px]"
          : "grid-cols-4 gap-x-[18px]"
        }`}
    >
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} variant={variant} />
      ))}
    </div>
  );
}
