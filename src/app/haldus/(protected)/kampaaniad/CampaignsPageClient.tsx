"use client";

import { useState } from "react";
import { CampaignForm } from "./CampaignForm";
import { ExistingCampaignsList } from "./ExistingCampaignsList";
import { CampaignGroupList } from "./CampaignGroupList";
import type { CampaignGroup } from "./page";

interface CampaignsPageClientProps {
  campaigns: Record<string, unknown>[];
  products: { id: string; sku: string; title_et: string; price: number; sale_price: number | null }[];
  autoGroups: CampaignGroup[];
  canDelete: boolean;
}

function campaignProductIds(campaign: Record<string, unknown> | null) {
  return new Set(
    ((campaign?.campaign_products as Record<string, unknown>[] | undefined) ?? []).map((product) =>
      String(product.product_id ?? "")
    )
  );
}

export function CampaignsPageClient({ campaigns, products, autoGroups, canDelete }: CampaignsPageClientProps) {
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const productIdBySku = new Map(products.map((product) => [product.sku, product.id]));
  function autoCampaignSlug(key: string) {
    return `imported-${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`;
  }
  const hasRealCampaignForGroup = (group: CampaignGroup) => {
    const [start, end] = group.key.split("|");
    const startsAt = start === "always" ? null : start;
    const endsAt = end === "open" ? null : end;
    const importedSlug = autoCampaignSlug(group.key);

    return campaigns.some((campaign) => {
      if (String(campaign.slug ?? "") === importedSlug) return true;
      const campaignStart = campaign.starts_at ? String(campaign.starts_at).slice(0, 10) : null;
      const campaignEnd = campaign.ends_at ? String(campaign.ends_at).slice(0, 10) : null;
      return campaignStart === startsAt && campaignEnd === endsAt;
    });
  };
  const autoCampaigns = autoGroups.filter((group) => !hasRealCampaignForGroup(group)).map((group) => {
    const [start, end] = group.key.split("|");
    const productIds = group.products
      .map((product) => productIdBySku.get(product.sku))
      .filter(Boolean)
      .map((productId) => ({ product_id: productId }));

    return {
      id: `auto:${group.key}`,
      name_et: group.label,
      slug: autoCampaignSlug(group.key),
      description_et: "",
      starts_at: start === "always" ? null : start,
      ends_at: end === "open" ? null : end,
      is_active: true,
      campaign_products: productIds,
      __source: "auto-sale-group",
    };
  });
  const selectableCampaigns = [...campaigns, ...autoCampaigns];
  const editingCampaign = editingCampaignId
    ? selectableCampaigns.find((campaign) => String(campaign.id) === editingCampaignId) ?? null
    : null;
  const editingCampaignProductKey = editingCampaign
    ? ((editingCampaign.campaign_products as Record<string, unknown>[] | undefined) ?? [])
        .map((product) => String(product.product_id ?? ""))
        .sort()
        .join("|")
    : "";

  function handleSelectCampaign(campaign: Record<string, unknown> | null) {
    setEditingCampaignId(campaign?.id ? String(campaign.id) : null);
    setSelectedProductIds(campaignProductIds(campaign));
  }

  function handleToggleProduct(productId: string) {
    setSelectedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <CampaignForm
            key={editingCampaign?.id ? `${String(editingCampaign.id)}:${editingCampaignProductKey}` : "new"}
            campaign={editingCampaign ?? undefined}
            products={products}
            campaigns={selectableCampaigns}
            canDelete={canDelete}
            selectedProductIds={selectedProductIds}
            onToggleProduct={handleToggleProduct}
            onSelectCampaign={handleSelectCampaign}
          />
        </div>

        <div className="min-w-0">
          <h3 className="font-heading text-lg mb-3">Tootekataloogi soodushinnad</h3>
          <p className="mb-3 text-xs text-muted">
            Linnuke näitab, kas toode kuulub valitud kampaaniasse. Muudatus kajastub kohe mõlemas veerus.
          </p>
          <CampaignGroupList
            groups={autoGroups}
            productIdBySku={productIdBySku}
            selectedProductIds={selectedProductIds}
            onToggleProduct={handleToggleProduct}
          />
        </div>
      </div>

      {campaigns.length > 0 && (
        <ExistingCampaignsList
          campaigns={campaigns}
          products={products}
          onEditCampaign={handleSelectCampaign}
        />
      )}
    </div>
  );
}
