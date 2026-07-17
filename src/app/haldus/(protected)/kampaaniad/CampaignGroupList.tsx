"use client";

import { useState } from "react";
import Link from "next/link";
import type { CampaignGroup } from "./page";

function formatEuro(value: number) {
  return value.toFixed(2) + " €";
}

function discountPercent(price: number, salePrice: number) {
  if (price === 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}

function CampaignGroupSection({
  group,
  defaultOpen = false,
  productIdBySku,
  selectedProductIds,
  onToggleProduct,
}: {
  group: CampaignGroup;
  defaultOpen?: boolean;
  productIdBySku: Map<string, string>;
  selectedProductIds: Set<string>;
  onToggleProduct: (productId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const selectedCount = group.products.filter((product) => {
    const productId = productIdBySku.get(product.sku);
    return productId ? selectedProductIds.has(productId) : false;
  }).length;

  return (
    <div className="border border-line bg-panel mb-2 min-w-0">
      <div className="w-full flex items-center justify-between gap-4 p-3 hover:bg-soft/50 text-left">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <div className="text-xs text-muted font-bold">{group.sublabel}</div>
          <div className="font-bold text-sm">{group.label}</div>
          <div className="text-xs text-muted mt-0.5">
            {selectedCount}/{group.products.length} kampaanias
          </div>
        </button>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen(!open)} className="p-1">
            <svg
              className={`w-4 h-4 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-soft text-left uppercase tracking-wide text-muted">
                <th className="p-2 w-8" />
                <th className="p-2 font-bold">SKU</th>
                <th className="p-2 font-bold">Toode</th>
                <th className="p-2 font-bold text-right">Tavahind</th>
                <th className="p-2 font-bold text-right">Soodushind</th>
                <th className="p-2 font-bold text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {group.products.map((p) => {
                const productId = productIdBySku.get(p.sku);
                return (
                <tr key={p.sku} className="border-t border-line hover:bg-soft/30">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={productId ? selectedProductIds.has(productId) : false}
                      disabled={!productId}
                      onChange={() => productId && onToggleProduct(productId)}
                      className="accent-ink h-4 w-4 disabled:opacity-40"
                      aria-label={`${p.title_et} kampaanias`}
                    />
                  </td>
                  <td className="p-2 font-mono">{p.sku}</td>
                  <td className="p-2 font-bold">
                    <Link href={`/raamat/${p.slug}`} className="hover:underline">
                      {p.title_et}
                    </Link>
                  </td>
                  <td className="p-2 text-right">{formatEuro(p.price)}</td>
                  <td className="p-2 text-right text-accent font-bold">{formatEuro(p.sale_price)}</td>
                  <td className="p-2 text-right">
                    <span className="bg-ink text-white text-xs font-bold px-1.5 py-0.5">
                      -{discountPercent(p.price, p.sale_price)}%
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CampaignGroupList({
  groups,
  productIdBySku,
  selectedProductIds,
  onToggleProduct,
}: {
  groups: CampaignGroup[];
  productIdBySku: Map<string, string>;
  selectedProductIds: Set<string>;
  onToggleProduct: (productId: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted py-4 text-center text-sm">
        Mitte ühelgi tootel ei ole soodushinda määratud.
      </p>
    );
  }

  return (
    <div>
      {groups.map((group, index) => (
        <CampaignGroupSection
          key={group.key}
          group={group}
          defaultOpen={index === 0}
          productIdBySku={productIdBySku}
          selectedProductIds={selectedProductIds}
          onToggleProduct={onToggleProduct}
        />
      ))}
    </div>
  );
}
