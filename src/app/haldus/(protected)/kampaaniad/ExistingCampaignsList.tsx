"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { removeProductsFromCampaign, toggleCampaignActive } from "@/app/haldus/taxonomy-actions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

interface CampaignRow {
  id: string;
  name_et: string;
  slug: string;
  description_et: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at?: string;
  campaign_products: { product_id: string }[];
}

interface ProductRow {
  id: string;
  sku: string;
  title_et: string;
  price: number;
  sale_price: number | null;
}

type SortOrder = "newest" | "oldest";

function getTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("et-EE");
}

export function ExistingCampaignsList({
  campaigns,
  products,
  onEditCampaign,
}: {
  campaigns: Record<string, unknown>[];
  products: ProductRow[];
  onEditCampaign: (c: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [removeState, removeAction, removePending] = useActionState<
    { error?: string; success?: boolean } | undefined,
    FormData
  >(removeProductsFromCampaign, undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedProductsByCampaign, setSelectedProductsByCampaign] = useState<
    Record<string, Set<string>>
  >({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const sorted = [...(campaigns as unknown as CampaignRow[])].sort((a, b) => {
    const diff = getTime(a.created_at) - getTime(b.created_at);
    return sortOrder === "newest" ? -diff : diff;
  });

  useEffect(() => {
    if (removeState?.success) router.refresh();
  }, [removeState?.success, router]);

  function productDetails(productIds: string[]) {
    return productIds
      .map((pid) => products.find((p) => p.id === pid))
      .filter(Boolean) as ProductRow[];
  }

  function selectedProductsFor(campaignId: string) {
    return selectedProductsByCampaign[campaignId] ?? new Set<string>();
  }

  function clearCampaignSelection(campaignId: string) {
    setSelectedProductsByCampaign((prev) => {
      const next = { ...prev };
      delete next[campaignId];
      return next;
    });
  }

  function toggleExpand(campaignId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
        clearCampaignSelection(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  }

  function toggleProduct(campaignId: string, productId: string) {
    setSelectedProductsByCampaign((prev) => {
      const nextSelection = new Set(prev[campaignId] ?? []);
      if (nextSelection.has(productId)) nextSelection.delete(productId);
      else nextSelection.add(productId);
      return { ...prev, [campaignId]: nextSelection };
    });
  }

  if (campaigns.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-heading text-lg">Olemasolevad kampaaniad</h3>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">
          Loomise aeg
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="border border-line bg-paper px-2 py-1 text-xs font-bold text-ink"
          >
            <option value="newest">Uuemad ees</option>
            <option value="oldest">Vanimad ees</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3">
        {sorted.map((c) => {
          const isActive = Boolean(c.is_active);
          const productIds = (c.campaign_products ?? []).map((cp) => cp.product_id);
          const isExpanded = expandedIds.has(c.id);
          const prods = productDetails(productIds);
          const selectedProducts = selectedProductsFor(c.id);
          const createdLabel = formatDate(c.created_at) ?? "Loomise aeg puudub";
          const campaignDates = c.starts_at
            ? `${formatDate(c.starts_at)} - ${c.ends_at ? formatDate(c.ends_at) : "tähtajatu"}`
            : "Kuupäevad määramata";

          return (
            <div key={c.id} className="border border-line bg-panel">
              <div className="flex items-center justify-between gap-4 p-4 min-w-0">
                <button
                  type="button"
                  className="flex-1 text-left hover:opacity-70"
                  onClick={() => toggleExpand(c.id)}
                >
                  <div className="min-w-0">
                    <span className="font-bold truncate inline-block max-w-full align-bottom">
                      {c.name_et}
                    </span>
                    <span className="text-xs text-muted font-mono ml-2">{c.slug}</span>
                    {isActive ? (
                      <StatusBadge variant="active" />
                    ) : (
                      <StatusBadge variant="draft" />
                    )}
                    <span className="text-xs text-muted ml-2">· {productIds.length} toodet</span>
                  </div>
                  <div className="text-xs text-muted mt-1 truncate">
                    Loodud {createdLabel} · {campaignDates}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <form action={toggleCampaignActive}>
                    <input type="hidden" name="campaign_id" value={c.id} />
                    <input type="hidden" name="is_active" value={String(!isActive)} />
                    <button
                      type="submit"
                      className={`min-w-24 px-3 py-1 text-xs font-bold ${
                        isActive ? "bg-leaf/10 text-leaf" : "bg-muted/10 text-muted"
                      }`}
                    >
                      {isActive ? "Aktiivne" : "Mitteaktiivne"}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => onEditCampaign(c as unknown as Record<string, unknown>)}
                    className="text-accent font-bold text-xs hover:underline whitespace-nowrap"
                  >
                    Muuda →
                  </button>
                  <button
                    type="button"
                    aria-label={isExpanded ? "Sulge kampaania" : "Ava kampaania"}
                    onClick={() => toggleExpand(c.id)}
                    className="p-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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

              {isExpanded && (
                <div className="border-t border-line">
                  <div className="p-3 flex flex-wrap items-center justify-between gap-3 bg-soft/30">
                    <span className="text-xs text-muted font-bold">
                      {selectedProducts.size} toodet valitud
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => clearCampaignSelection(c.id)}
                        disabled={selectedProducts.size === 0 || removePending}
                        className="text-xs text-muted hover:underline disabled:opacity-30"
                      >
                        Tühista valik
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedProducts.size > 0) setConfirmRemove(c.id);
                        }}
                        disabled={selectedProducts.size === 0 || removePending}
                        className="text-xs text-accent font-bold hover:underline disabled:opacity-30"
                      >
                        Eemalda valitud
                      </button>
                    </div>
                  </div>

                  {confirmRemove === c.id && (
                    <ConfirmDialog
                      open={confirmRemove === c.id}
                      title="Eemalda tooted"
                      message={`Eemalda ${selectedProducts.size} toodet kampaaniast "${c.name_et}"?`}
                      variant="danger"
                      confirmLabel="Eemalda"
                      onConfirm={() => {
                        const selected = selectedProductsFor(c.id);
                        if (selected.size === 0) return;
                        const form = new FormData();
                        form.set("campaign_id", c.id);
                        selected.forEach((id) => form.append("product_ids", id));
                        removeAction(form);
                        setConfirmRemove(null);
                        clearCampaignSelection(c.id);
                      }}
                      onCancel={() => setConfirmRemove(null)}
                    />
                  )}

                  {removeState?.error && (
                    <p className="text-accent text-xs font-bold px-3 py-1">
                      {removeState.error}
                    </p>
                  )}

                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-soft text-left text-xs uppercase tracking-wide text-muted">
                          <th className="p-2 w-8" />
                          <th className="p-2 font-bold">SKU</th>
                          <th className="p-2 font-bold">Toode</th>
                          <th className="p-2 font-bold text-right">Hind</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prods.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-3 text-muted text-center text-sm">
                              Kampaanias ei ole tooteid.
                            </td>
                          </tr>
                        ) : (
                          prods.map((p) => (
                            <tr key={p.id} className="border-t border-line hover:bg-soft/30">
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.has(p.id)}
                                  onChange={() => toggleProduct(c.id, p.id)}
                                  className="accent-ink h-4 w-4"
                                />
                              </td>
                              <td className="p-2 font-mono text-xs">{p.sku}</td>
                              <td className="p-2 font-bold">{p.title_et}</td>
                              <td className="p-2 text-right text-xs">
                                {Number(p.price).toFixed(2)} €
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
