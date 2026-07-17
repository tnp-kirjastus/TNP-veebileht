"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCampaign, saveCampaign } from "@/app/haldus/taxonomy-actions";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FormField } from "@/components/admin/FormField";

interface CampaignProduct {
  id: string;
  sku: string;
  title_et: string;
  price: number;
  sale_price: number | null;
}

export function CampaignForm({
  campaign,
  products,
  campaigns,
  canDelete,
  selectedProductIds,
  onToggleProduct,
  onSelectCampaign,
}: {
  campaign?: Record<string, unknown>;
  products: CampaignProduct[];
  campaigns: Record<string, unknown>[];
  canDelete: boolean;
  selectedProductIds: Set<string>;
  onToggleProduct: (productId: string) => void;
  onSelectCampaign: (c: Record<string, unknown> | null) => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    { error?: string; success?: boolean; id?: string } | undefined,
    FormData
  >(saveCampaign, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteCampaign, undefined);
  const [productSearch, setProductSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isActive, setIsActive] = useState(campaign?.is_active !== false);
  const isPersistedCampaign = Boolean(campaign?.id && !String(campaign.id).startsWith("auto:"));

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [router, state?.success]);

  useEffect(() => {
    if (!deleteState?.success) return;
    onSelectCampaign(null);
    router.refresh();
  }, [deleteState?.success, onSelectCampaign, router]);

  const matchingProducts = productSearch.trim()
    ? products.filter(
        (p) =>
          p.title_et.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.sku.includes(productSearch)
      )
    : products;
  const filtered = [...matchingProducts].sort(
    (a, b) => Number(selectedProductIds.has(b.id)) - Number(selectedProductIds.has(a.id))
  );

  return (
    <form
      action={action}
      className="w-full max-w-full min-w-0 overflow-hidden border border-line bg-panel p-5 grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg">
          {campaign ? "Halda kampaaniat" : "Uus kampaania"}
        </h3>
        <label className="inline-flex items-center gap-2 text-sm font-bold">
          <input type="hidden" name="is_active" value={String(isActive)} />
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="accent-ink h-4 w-4"
          />
          {isActive ? "Aktiivne" : "Mitteaktiivne"}
        </label>
      </div>

      <FormField label="Loo uus või halda olemasolevat">
        <select
          value={campaign?.id ? String(campaign.id) : ""}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) {
              onSelectCampaign(null);
              return;
            }
            const found = campaigns.find((c) => String(c.id) === id);
            if (found) onSelectCampaign(found);
          }}
          className="border border-line bg-paper p-2 text-sm font-normal w-full truncate"
        >
          <option value="">Loo uus või halda olemasolevat</option>
          {(campaigns ?? []).map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {String(c.name_et ?? String(c.slug ?? ""))}
            </option>
          ))}
        </select>
      </FormField>

      {isPersistedCampaign && <input type="hidden" name="id" value={String(campaign?.id)} />}
      {Array.from(selectedProductIds).map((id) => (
        <input key={id} type="hidden" name="product_ids" value={id} />
      ))}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 text-sm font-bold">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="campaign-name">Nimi <span className="text-accent">*</span></label>
            {isPersistedCampaign && canDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deletePending}
                className="text-xs font-bold text-accent hover:underline disabled:opacity-50"
              >
                Kustuta kampaania
              </button>
            )}
          </div>
          <input
            id="campaign-name"
            name="name_et"
            required
            maxLength={200}
            defaultValue={campaign ? String(campaign.name_et ?? "") : ""}
            className="border border-line bg-paper p-2 text-sm font-normal w-full"
          />
        </div>
      </div>

      <FormField label="Kirjeldus">
        <textarea
          name="description_et"
          rows={3}
          maxLength={5000}
          defaultValue={campaign ? String(campaign.description_et ?? "") : ""}
          className="border border-line bg-paper p-2 text-sm font-normal w-full"
        />
      </FormField>

      <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-4 max-sm:grid-cols-1">
        <FormField label="Algus">
          <input
            name="starts_at"
            type="date"
            defaultValue={campaign?.starts_at ? String(campaign.starts_at).slice(0, 10) : ""}
            className="border border-line bg-paper p-2 text-sm font-normal w-full"
          />
        </FormField>
        <FormField label="Lõpp">
          <input
            name="ends_at"
            type="date"
            defaultValue={campaign?.ends_at ? String(campaign.ends_at).slice(0, 10) : ""}
            className="border border-line bg-paper p-2 text-sm font-normal w-full"
          />
        </FormField>
      </div>

      <div className="border-t border-line pt-4">
        <h4 className="font-bold text-sm mb-3">
          Tooted kampaanias ({selectedProductIds.size} valitud)
        </h4>
        <input
          type="search"
          placeholder="Otsi tooteid..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="w-full min-w-0 border border-line p-2 text-sm mb-2"
        />
        <div className="max-h-[300px] min-w-0 overflow-y-auto border border-line">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted">Tooteid ei leitud.</p>
          ) : (
            filtered.map((p) => (
              <label
                key={p.id}
                className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm hover:bg-soft cursor-pointer border-b border-line last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.has(p.id)}
                  onChange={() => onToggleProduct(p.id)}
                  className="accent-ink h-4 w-4"
                />
                <span className="min-w-0 flex-1 truncate">
                  {p.title_et} <span className="text-muted text-xs">({p.sku})</span>
                </span>
                <span className="text-muted text-xs whitespace-nowrap">
                  {Number(p.price).toFixed(2)} €
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      {(state?.error || deleteState?.error) && (
        <p className="text-accent text-sm font-bold">{state?.error ?? deleteState?.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start min-h-10 px-6 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50"
      >
        {pending ? "Salvestan..." : campaign ? "Salvesta kampaania" : "Loo kampaania"}
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title="Kustuta kampaania"
        message={`Kas kustutada kampaania "${String(campaign?.name_et ?? "")}"? Kampaanias olevad raamatud jäävad alles.`}
        confirmLabel="Kustuta kampaania"
        variant="danger"
        onConfirm={() => {
          const formData = new FormData();
          formData.set("id", String(campaign?.id ?? ""));
          deleteAction(formData);
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
