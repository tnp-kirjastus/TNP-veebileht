"use client";

import { useActionState, useState, useRef, useCallback } from "react";
import { saveProduct } from "@/app/haldus/product-actions";
import { FormField } from "./FormField";
import { getCoverUrlClient } from "@/lib/media-url";

interface SeriesData { id: string; slug: string; name_et: string; }

interface Edition { type: string; date: string; }

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
  allow_preorder?: boolean;
  cover_image?: string | null;
  series_id?: string | null;
  status?: ProductStatus;
  category_ids?: string[];
  person_ids?: Record<string, string[]>;
  seo_title?: string | null;
  seo_description?: string | null;
  editions?: Edition[];
}

function computeStatus(product: EditableProduct): ProductStatus {
  if (product.is_archived) return "archived";
  if (product.is_upcoming) return "upcoming";
  return "active";
}

const TABS = ["identity", "content", "commerce", "meta", "cover", "people", "seo", "editions"] as const;
type Tab = (typeof TABS)[number];

type CoverAction = "keep" | "replace" | "remove";

function tabLabel(tab: Tab): string {
  switch (tab) {
    case "identity": return "Identiteet";
    case "content": return "Sisu";
    case "commerce": return "Hind ja ladu";
    case "meta": return "Metaandmed";
    case "cover": return "Kaanepilt";
    case "people": return "Autorid";
    case "seo": return "SEO";
    case "editions": return "Trükid";
  }
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
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [coverAction, setCoverAction] = useState<CoverAction>("keep");
  const [coverObjectKey, setCoverObjectKey] = useState<string>(product.cover_image ?? "");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [editions, setEditions] = useState<Edition[]>(product.editions ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  const originalCover = product.cover_image ?? null;
  const currentCoverUrl = coverAction === "remove"
    ? null
    : coverObjectKey
      ? getCoverUrlClient(coverObjectKey)
      : null;
  const originalCoverUrl = originalCover ? getCoverUrlClient(originalCover) : null;

  const acceptedTypes = ".jpg,.jpeg,.png,.webp,.avif,.tif,.tiff";
  const maxFileSize = 50 * 1024 * 1024;

  const handleUpload = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = ["jpg", "jpeg", "png", "webp", "avif", "tif", "tiff"];
    if (!allowed.includes(ext)) {
      setUploadError("Toetatud on JPG, PNG, WebP, AVIF ja TIFF.");
      return;
    }
    if (file.size > maxFileSize) {
      setUploadError("Fail on liiga suur (max 50 MB).");
      return;
    }

    setUploadBusy(true);
    setUploadError("");
    setUploadWarning("");

    const localPreview = URL.createObjectURL(file);
    setUploadPreview(localPreview);

    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("productId", product.id ?? "new");

      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setUploadError(json.error ?? "Üleslaadimine ebaõnnestus.");
        URL.revokeObjectURL(localPreview);
        setUploadPreview(null);
        return;
      }

      setCoverObjectKey(json.objectKey);
      setCoverAction("replace");
      setUploadPreview(null);
      URL.revokeObjectURL(localPreview);
      if (json.warning) setUploadWarning(json.warning);
    } catch {
      setUploadError("Võrguviga üleslaadimisel.");
      setUploadPreview(null);
    } finally {
      setUploadBusy(false);
    }
  }, [product.id]);

  function handleRemove() {
    setCoverObjectKey("");
    setCoverAction("remove");
    setUploadPreview(null);
    setUploadError("");
    setUploadWarning("");
  }

  function handleRevertToOriginal() {
    setCoverObjectKey(originalCover ?? "");
    setCoverAction("keep");
    setUploadPreview(null);
    setUploadError("");
    setUploadWarning("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  const coverImageValue =
    coverAction === "remove" ? "[CLEAR]" : coverObjectKey;

  const tabClass = (active: boolean) =>
    active
      ? "px-4 py-2.5 font-bold text-sm border-b-2 border-ink cursor-pointer"
      : "px-4 py-2.5 font-bold text-sm text-muted hover:text-ink border-b-2 border-transparent cursor-pointer";

  function scrollToTab(tab: Tab) {
    setActiveTab(tab);
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <form action={action} className="max-w-5xl">
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="cover_image" value={coverImageValue} />
      <input type="hidden" name="editions" value={JSON.stringify(editions)} />

      <div className="border border-line bg-panel">
        {/* Tab bar */}
        <div className="flex border-b border-line bg-soft overflow-x-auto sticky top-0 z-10">
          {TABS.map((tab) => (
            <button key={tab} type="button" className={tabClass(activeTab === tab)} onClick={() => scrollToTab(tab)}>
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="p-6 grid gap-6">
          {/* Identity */}
          <fieldset id="tab-identity">
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
          <fieldset id="tab-content" className="border-t border-line pt-6">
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
          <fieldset id="tab-commerce" className="border-t border-line pt-6">
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
            {status === "upcoming" && (
              <div className="mt-5 flex gap-4">
                <input type="hidden" name="allow_preorder" value="false" />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" name="allow_preorder" value="true" defaultChecked={product.allow_preorder ?? true} className="accent-ink h-4 w-4" /> Luba ettetellimine
                </label>
              </div>
            )}
          </fieldset>

          {/* Metadata */}
          <fieldset id="tab-meta" className="border-t border-line pt-6">
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

          {/* Cover image */}
          <fieldset id="tab-cover" className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Kaanepilt</legend>

            <div className="grid grid-cols-[auto_1fr] gap-6 items-start max-md:grid-cols-1">
              {/* Preview column */}
              <div className="w-[200px]">
                {currentCoverUrl ? (
                  <img
                    src={currentCoverUrl}
                    alt="Kaanepildi eelvaade"
                    className="w-full border border-line object-contain max-h-[300px]"
                  />
                ) : originalCoverUrl ? (
                  <img
                    src={originalCoverUrl}
                    alt="Praegune kaanepilt"
                    className="w-full border border-line object-contain max-h-[300px] opacity-40"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] border border-dashed border-line bg-soft flex items-center justify-center text-muted text-xs text-center p-3">
                    Kaanepilt puudub
                  </div>
                )}

                {coverAction === "remove" && (
                  <p className="text-xs text-accent font-bold mt-2 text-center">Eemaldatakse</p>
                )}
                {coverAction === "replace" && (
                  <p className="text-xs text-leaf font-bold mt-2 text-center">Asendatakse</p>
                )}
              </div>

              {/* Controls column */}
              <div className="grid gap-4">
                {/* Upload zone */}
                <div
                  className={`border-2 border-dashed p-6 text-center transition-colors ${
                    dropActive ? "border-ink bg-soft" : "border-line hover:border-ink/60"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                  onDragLeave={() => setDropActive(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept={acceptedTypes}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                    className="hidden"
                    id="cover-file-input"
                  />
                  <label htmlFor="cover-file-input" className="cursor-pointer block">
                    <p className="text-sm font-bold text-ink">
                      {uploadBusy ? "Laadin üles…" : "Lohista fail siia või klõpsa valimiseks"}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      JPG, PNG, WebP, AVIF, TIFF — kuni 50 MB
                    </p>
                  </label>

                  {uploadBusy && (
                    <div className="mt-3 w-full bg-soft h-2 overflow-hidden">
                      <div className="h-full bg-ink animate-pulse w-full" />
                    </div>
                  )}
                </div>

                {uploadPreview && uploadBusy && (
                  <div className="border border-line p-3">
                    <img src={uploadPreview} alt="Eelvaade" className="max-h-40 object-contain mx-auto" />
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-accent font-bold">{uploadError}</p>
                )}
                {uploadWarning && (
                  <p className="text-xs text-amber-600 font-bold">{uploadWarning}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  {originalCover && coverAction !== "keep" && (
                    <button type="button" onClick={handleRevertToOriginal}
                      className="min-h-10 px-4 border border-line text-sm font-bold hover:bg-soft">
                      Taasta algne
                    </button>
                  )}
                  {originalCover && coverAction !== "remove" && (
                    <button type="button" onClick={handleRemove}
                      className="min-h-10 px-4 border border-line text-sm font-bold text-accent hover:bg-accent/5">
                      Eemalda kaanepilt
                    </button>
                  )}
                </div>

                {coverObjectKey && coverAction !== "remove" && (
                  <p className="text-xs text-muted font-mono break-all">
                    {coverObjectKey.startsWith("products/") ? "Storage: " : "Fail: "}
                    {coverObjectKey.length > 60
                      ? coverObjectKey.slice(0, 30) + "…" + coverObjectKey.slice(-30)
                      : coverObjectKey}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* People / Authors */}
          <fieldset id="tab-people" className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Autorid ja tegijad</legend>
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
            <p className="text-xs text-muted mt-3">Sisesta inimese nimi. Kui inimest ei leita, tuleb ta esmalt luua Autorid vaates.</p>
          </fieldset>

          {/* SEO */}
          <fieldset id="tab-seo" className="border-t border-line pt-6">
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

          {/* Editions */}
          <fieldset id="tab-editions" className="border-t border-line pt-6">
            <legend className="font-heading text-xl mb-4">Trükid</legend>
            <div className="grid gap-4">
              {editions.map((ed, i) => (
                <div key={i} className="flex items-center gap-3 border border-line p-3 bg-paper">
                  <span className="text-xs text-muted font-bold min-w-[40px]">#{i + 1}</span>
                  <input
                    type="text"
                    value={ed.type}
                    onChange={(e) => {
                      const next = [...editions];
                      next[i] = { ...next[i], type: e.target.value };
                      setEditions(next);
                    }}
                    placeholder="Tüüp (nt 2. trükk)"
                    className="border border-line bg-paper p-2 font-normal text-sm flex-1"
                  />
                  <input
                    type="date"
                    value={ed.date.slice(0, 10)}
                    onChange={(e) => {
                      const next = [...editions];
                      next[i] = { ...next[i], date: e.target.value };
                      setEditions(next);
                    }}
                    className="border border-line bg-paper p-2 font-normal text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setEditions(editions.filter((_, j) => j !== i))}
                    className="min-h-8 px-3 border border-line text-sm font-bold text-accent hover:bg-accent/5"
                  >
                    Eemalda
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditions([...editions, { type: "", date: "" }])}
                className="min-h-10 px-4 border border-line text-sm font-bold hover:bg-soft self-start"
              >
                + Lisa trükk
              </button>
            </div>
          </fieldset>
        </div>
      </div>

      {state?.error && <p role="alert" className="text-accent font-bold mt-4">{state.error}</p>}
      {state?.success && <p role="status" className="text-leaf font-bold mt-4">Toode salvestatud!</p>}

      <div className="flex gap-3 mt-6">
        <button type="submit" disabled={pending || uploadBusy} className="min-h-12 px-8 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">
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
