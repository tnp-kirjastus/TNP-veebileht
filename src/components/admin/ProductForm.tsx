"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/app/haldus/product-actions";
import { FormField } from "./FormField";

interface SeriesData { id: string; slug: string; name_et: string; }

type ProductStatus = "draft" | "active" | "upcoming" | "archived";

export interface EditableProduct {
  id?: string;
  sku?: string;
  title_et?: string;
  title_en?: string | null;
  slug?: string;
  description_et?: string | null;
  description_en?: string | null;
  price?: number;
  sale_price?: number | null;
  sale_start?: string | null;
  sale_end?: string | null;
  stock?: number;
  binding?: string | null;
  pages?: number | null;
  release_date?: string | null;
  origin?: "estonian" | "foreign";
  is_upcoming?: boolean;
  is_archived?: boolean;
  is_featured?: boolean;
  cover_image?: string | null;
  series_id?: string | null;
  status?: ProductStatus;
  category_ids?: string[];
  person_ids?: Record<string, string[]>;
  seo_title?: string | null;
  seo_description?: string | null;
}

function computeStatus(product: EditableProduct): ProductStatus {
  if (product.is_archived) return "archived";
  if (product.is_upcoming) return "upcoming";
  return "active";
}

export function ProductForm({
  product = {},
  series,
}: {
  product?: EditableProduct;
  series: SeriesData[];
}) {
  const [state, action, pending] = useActionState(saveProduct, undefined);
  const [status, setStatus] = useState<ProductStatus>(product.status ?? computeStatus(product));

  const tabClass = (active: boolean) =>
    active
      ? "px-4 py-2.5 font-bold text-sm border-b-2 border-ink"
      : "px-4 py-2.5 font-bold text-sm text-muted hover:text-ink border-b-2 border-transparent";

  return (
    <form action={action} className="max-w-5xl">
      {product.id && <input type="hidden" name="id" value={product.id} />}

      <div className="border border-line bg-panel">
        {/* Tab bar */}
        <div className="flex border-b border-line bg-soft overflow-x-auto">
          {(["identity", "content", "commerce", "meta", "people", "seo"] as const).map((tab) => (
            <button key={tab} type="button" className={tabClass(false)}>
              {tab === "identity" ? "Identiteet" : tab === "content" ? "Sisu" : tab === "commerce" ? "Hind ja ladu" : tab === "meta" ? "Metaandmed" : tab === "people" ? "Inimesed" : "SEO"}
            </button>
          ))}
        </div>

        <div className="p-6 grid gap-6">
          {/* Identity */}
          <fieldset>
            <legend className="font-heading text-xl mb-4">Identiteet</legend>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <FormField label="ISBN / SKU" required>
                <input name="sku" required minLength={3} maxLength={50} defaultValue={product.sku} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="URL-i nimi" required>
                <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={product.slug} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-5 mt-5">
              <FormField label="Pealkiri (eesti keeles)" required>
                <input name="title_et" required maxLength={300} defaultValue={product.title_et} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Pealkiri (inglise keeles)">
                <input name="title_en" maxLength={300} defaultValue={product.title_en ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
            </div>
          </fieldset>

          {/* Content */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Sisu</legend>
            <div className="grid gap-5">
              <FormField label="Kirjeldus (eesti keeles) — HTML lubatud">
                <textarea name="description_et" rows={10} maxLength={50000} defaultValue={product.description_et ?? ""} className="border border-line bg-paper p-3 font-mono text-sm font-normal" />
              </FormField>
              <FormField label="Kirjeldus (inglise keeles)">
                <textarea name="description_en" rows={6} maxLength={50000} defaultValue={product.description_en ?? ""} className="border border-line bg-paper p-3 font-mono text-sm font-normal" />
              </FormField>
            </div>
          </fieldset>

          {/* Commerce */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Hind ja laoseis</legend>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <FormField label="Hind (€)" required>
                <input name="price" type="number" step="0.01" min="0" required defaultValue={product.price ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Soodushind (€)">
                <input name="sale_price" type="number" step="0.01" min="0" defaultValue={product.sale_price ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Soodustuse algus">
                <input name="sale_start" type="date" defaultValue={product.sale_start?.slice(0, 10) ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Soodustuse lõpp">
                <input name="sale_end" type="date" defaultValue={product.sale_end?.slice(0, 10) ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Laoseis" required>
                <input name="stock" type="number" min="0" required defaultValue={product.stock ?? 0} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Olek">
                <select name="status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className="border border-line bg-paper p-3 font-normal text-sm">
                  <option value="draft">Mustand</option>
                  <option value="active">Aktiivne</option>
                  <option value="upcoming">Ilmumas</option>
                  <option value="archived">Arhiveeritud</option>
                </select>
              </FormField>
            </div>
          </fieldset>

          {/* Metadata */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Metaandmed</legend>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <FormField label="Köide">
                <input name="binding" maxLength={100} defaultValue={product.binding ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Lehekülgi">
                <input name="pages" type="number" min="0" defaultValue={product.pages ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Ilmumiskuupäev">
                <input name="release_date" type="date" defaultValue={product.release_date?.slice(0, 10) ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Päritolu">
                <select name="origin" defaultValue={product.origin ?? "estonian"} className="border border-line bg-paper p-3 font-normal text-sm">
                  <option value="estonian">Eesti</option>
                  <option value="foreign">Välismaine</option>
                </select>
              </FormField>
              <FormField label="Sari">
                <select name="series_id" defaultValue={product.series_id ?? ""} className="border border-line bg-paper p-3 font-normal text-sm">
                  <option value="">— Vali sari —</option>
                  {series.map((s) => <option key={s.id} value={s.id}>{s.name_et}</option>)}
                </select>
              </FormField>
              <FormField label="Kategooriad (komaga eraldatud ID-d)">
                <input name="category_ids" defaultValue={product.category_ids?.join(",") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" placeholder="Nt: uuid1, uuid2" />
              </FormField>
            </div>
            <div className="mt-5 flex gap-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" name="is_featured" defaultChecked={product.is_featured ?? false} className="accent-ink h-4 w-4" /> Esiletõstetud
              </label>
            </div>
          </fieldset>

          {/* People */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Inimesed</legend>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <FormField label="Autor(id) — nimed komaga">
                <input name="people_authors" defaultValue={product.person_ids?.["author"]?.join(", ") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Tõlkija(d) — nimed komaga">
                <input name="people_translators" defaultValue={product.person_ids?.["translator"]?.join(", ") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Toimetaja(d) — nimed komaga">
                <input name="people_editors" defaultValue={product.person_ids?.["editor"]?.join(", ") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Kujundaja(d) — nimed komaga">
                <input name="people_designers" defaultValue={product.person_ids?.["designer"]?.join(", ") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="Illustreerija(d) — nimed komaga">
                <input name="people_illustrators" defaultValue={product.person_ids?.["illustrator"]?.join(", ") ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
            </div>
            <p className="text-xs text-muted mt-3">Sisesta inimese nimi. Kui inimest ei leita, tuleb ta esmalt luua Inimesed vaates.</p>
          </fieldset>

          {/* Cover image */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Kaanepilt</legend>
            <FormField label="Kaanepildi failinimi (nt mybook.jpg)">
              <input name="cover_image" maxLength={500} defaultValue={product.cover_image ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
            </FormField>
          </fieldset>

          {/* SEO */}
          <fieldset className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">SEO</legend>
            <div className="grid grid-cols-1 gap-5">
              <FormField label="SEO pealkiri (max 70)">
                <input name="seo_title" maxLength={70} defaultValue={product.seo_title ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
              <FormField label="SEO kirjeldus (max 170)">
                <textarea name="seo_description" maxLength={170} rows={2} defaultValue={product.seo_description ?? ""} className="border border-line bg-paper p-3 font-normal text-sm" />
              </FormField>
            </div>
          </fieldset>
        </div>
      </div>

      {state?.error && <p role="alert" className="text-accent font-bold mt-4">{state.error}</p>}
      {state?.success && <p role="status" className="text-leaf font-bold mt-4">Toode salvestatud!</p>}

      <div className="flex gap-3 mt-6">
        <button type="submit" disabled={pending} className="min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50">
          {pending ? "Salvestan…" : product.id ? "Salvesta muudatused" : "Loo toode"}
        </button>
        {product.id && (
          <button type="button" className="min-h-12 px-8 border border-line text-muted font-bold hover:bg-soft">
            Eelvaade
          </button>
        )}
      </div>
    </form>
  );
}
