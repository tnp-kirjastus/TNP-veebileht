"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { sanitizeRichText } from "@/lib/sanitize";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { revalidateProduct } from "@/lib/revalidate";
import { getMediaInfo, processImage, uploadCover, generateObjectKey, isValidZipEntryPath, normalizeIsbn, isbn10To13 } from "@/lib/media";
import { createHash } from "node:crypto";
import { extractZip } from "@/lib/zip";

const rowSchema = z.record(z.string(), z.any());
const importSchema = z.object({
  rows: z.array(rowSchema),
  mode: z.enum(["full", "partial", "stock", "price"]),
  mapping: z.record(z.string(), z.string()),
  archiveBase64: z.string().optional(),
});

type MediaStatus = "new" | "replace" | "unchanged" | "missing" | "ambiguous" | "invalid";

interface ImportResult {
  row: number;
  sku: string;
  title: string;
  status: "new" | "update" | "unchanged" | "conflict" | "invalid";
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  errors: string[];
  media?: {
    status: MediaStatus;
    sourceFile: string | null;
    width: number | null;
    height: number | null;
    warning: string | null;
    validationError: string | null;
    willReplace: boolean;
  };
}

const COVER_COLUMN_ALIASES = ["cover_file", "cover_url", "Pilt", "Toote Kaanepilt"];

<<<<<<< HEAD
function slugify(text: string): string {
  const t: Record<string, string> = { "õ": "o", "ä": "a", "ö": "o", "ü": "u", "š": "s", "ž": "z", "Õ": "O", "Ä": "A", "Ö": "O", "Ü": "U", "Š": "S", "Ž": "Z" };
  let r = String(text);
  for (const [k, v] of Object.entries(t)) r = r.replace(new RegExp(k, "g"), v);
  return r.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function parsePipeList(raw: string | undefined): string[] {
  if (!raw) return [];
  return String(raw).split("|").map((s) => s.trim()).filter(Boolean);
}

=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
interface ExistingProduct {
  id: string;
  sku: string;
  slug: string;
  title_et: string;
  price: number;
  sale_price: number | null;
  stock: number;
  cover_image: string | null;
<<<<<<< HEAD
  binding: string | null;
  pages: number | null;
  release_date: string | null;
  origin: string;
  is_archived: boolean;
  is_upcoming: boolean;
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
}

function findCoverColumn(mapping: Record<string, string>): string | null {
  for (const alias of COVER_COLUMN_ALIASES) {
    for (const [field, col] of Object.entries(mapping)) {
      if (col === alias) return alias;
    }
  }
  return null;
}

async function parseZipEntries(base64: string): Promise<Map<string, { buffer: Buffer; name: string }>> {
  const entries = new Map<string, { buffer: Buffer; name: string }>();

  if (!base64) return entries;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw new Error("Vigane ZIP-faili kodeering");
  }

  if (buffer.length > 200 * 1024 * 1024) {
    throw new Error("ZIP-arhiiv on liiga suur (max 200 MB)");
  }

  const extracted = extractZip(buffer, 200 * 1024 * 1024);

  const allowedExts = new Set(["jpg", "jpeg", "png", "webp", "avif", "tif", "tiff"]);
  for (const entry of extracted) {
    const ext = entry.filename.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExts.has(ext)) continue;
    if (!isValidZipEntryPath(entry.filename)) continue;

    entries.set(entry.filename.toLowerCase(), { buffer: entry.buffer, name: entry.filename });
    if (entries.size > 5000) throw new Error("Liiga palju faile arhiivis (max 5000)");
  }

  return entries;
}

function matchCoverFromArchive(
  sku: string,
  coverFileColumn: string | null,
  row: Record<string, unknown>,
  archiveEntries: Map<string, { buffer: Buffer; name: string }>,
): { entry: { buffer: Buffer; name: string } | null; matchType: "exact" | "isbn" | "none"; ambiguous: boolean } {
  if (archiveEntries.size === 0) return { entry: null, matchType: "none", ambiguous: false };

  const isbn = normalizeIsbn(sku);
  const isbn13 = isbn10To13(isbn);

  if (coverFileColumn) {
    const coverFileVal = String(row[coverFileColumn] ?? "").trim();
    if (coverFileVal) {
      const normalizedName = coverFileVal.replace(/\\/g, "/").split("/").pop()?.toLowerCase();
      if (normalizedName && archiveEntries.has(normalizedName)) {
        return { entry: archiveEntries.get(normalizedName)!, matchType: "exact", ambiguous: false };
      }
    }
  }

  const extensions = ["jpg", "jpeg", "png", "webp", "avif", "tif", "tiff"];
  let matchedEntry: { buffer: Buffer; name: string } | null = null;
  let matchedCount = 0;

  for (const ext of extensions) {
    const key = `${isbn}.${ext}`;
    if (archiveEntries.has(key)) {
      matchedCount++;
      matchedEntry = archiveEntries.get(key)!;
    }
    if (isbn13) {
      const key13 = `${isbn13}.${ext}`;
      if (archiveEntries.has(key13)) {
        matchedCount++;
        if (!matchedEntry) matchedEntry = archiveEntries.get(key13)!;
      }
    }
  }

  if (matchedCount > 1) return { entry: matchedEntry, matchType: "isbn", ambiguous: true };
  if (matchedEntry) return { entry: matchedEntry, matchType: "isbn", ambiguous: false };
  return { entry: null, matchType: "none", ambiguous: false };
}

export async function compareImport(_state: unknown, formData: FormData): Promise<{
  success?: boolean;
  results?: ImportResult[];
  error?: string;
}> {
  await requireAdminSession(["admin"]);
  const raw = JSON.parse(formData.get("payload") as string);
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vigane sisend." };

  const { rows, mapping, archiveBase64 } = parsed.data;
  const skuField = mapping.sku || "isbn";
  const titleField = mapping.title || "title";
  const priceField = mapping.price || "price";
  const stockField = mapping.stock || "stock";

  let archiveEntries: Map<string, { buffer: Buffer; name: string }> = new Map();
  if (archiveBase64) {
    try {
      archiveEntries = await parseZipEntries(archiveBase64);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "ZIP-arhiivi töötlemine ebaõnnestus" };
    }
  }

  const coverCol = findCoverColumn(mapping);

  const db = createAdminClient();
<<<<<<< HEAD
  const allExisting: ExistingProduct[] = [];
  let eFrom = 0;
  while (true) {
    const { data } = await db.schema("commerce").from("products").select("id,sku,slug,title_et,price,sale_price,stock,cover_image,binding,pages,release_date,origin,is_archived,is_upcoming").range(eFrom, eFrom + 999);
    if (!data || data.length === 0) break;
    allExisting.push(...data as ExistingProduct[]);
    if (data.length < 1000) break;
    eFrom += 1000;
  }
  const existingBySku = new Map<string, ExistingProduct>();
  for (const p of allExisting) {
    if (p.sku) existingBySku.set(String(p.sku).trim().toUpperCase(), p);
=======
  const { data: existing } = await db.schema("commerce").from("products").select("id,sku,slug,title_et,price,sale_price,stock,cover_image");
  const existingBySku = new Map<string, ExistingProduct>();
  if (existing) {
    for (const p of existing as ExistingProduct[]) {
      if (p.sku) existingBySku.set(String(p.sku).trim().toUpperCase(), p);
    }
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  }

  const results: ImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sku = String(row[skuField] ?? "").trim();
    const title = String(row[titleField] ?? "").trim();
    const errors: string[] = [];

    if (!sku) {
      results.push({
        row: i + 1, sku: "", title, status: "invalid",
        changes: [], errors: ["ISBN puudub"],
        media: { status: "missing", sourceFile: null, width: null, height: null, warning: null, validationError: null, willReplace: false },
      });
      continue;
    }
    if (!title) errors.push("Pealkiri puudub");

    const existingProduct = existingBySku.get(sku.toUpperCase());
    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    let mediaStatus: MediaStatus = "unchanged";
<<<<<<< HEAD
    const mediaInfo: {
=======
    let mediaInfo: {
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      sourceFile: string | null;
      width: number | null;
      height: number | null;
      warning: string | null;
      validationError: string | null;
      willReplace: boolean;
    } = { sourceFile: null, width: null, height: null, warning: null, validationError: null, willReplace: false };

    const { entry, matchType, ambiguous } = matchCoverFromArchive(sku, coverCol, row, archiveEntries);

    if (entry) {
      mediaInfo.sourceFile = entry.name;

      try {
        const info = await getMediaInfo(entry.buffer);
        if (!info.signature) {
          mediaStatus = "invalid";
          mediaInfo.validationError = "Faili signatuur ei vasta lubatud pildivormingutele";
        } else {
          mediaInfo.width = info.width;
          mediaInfo.height = info.height;
          mediaInfo.warning = info.warning;

          if (existingProduct && existingProduct.cover_image) {
            mediaInfo.willReplace = true;
            mediaStatus = "replace";
          } else {
            mediaStatus = "new";
          }
        }
      } catch {
        mediaStatus = "invalid";
        mediaInfo.validationError = "Pildi töötlemine ebaõnnestus";
      }

      if (ambiguous) {
        mediaStatus = "ambiguous";
        mediaInfo.warning = "Mitu ISBN-ile vastavat faili leitud";
      }
    } else if (coverCol && String(row[coverCol] ?? "").trim()) {
      mediaStatus = "missing";
      mediaInfo.sourceFile = String(row[coverCol] ?? "").trim();
      mediaInfo.validationError = "Faili ei leitud ZIP-arhiivist";
    } else {
      mediaStatus = existingProduct ? "unchanged" : "missing";
    }

    if (!existingProduct) {
      results.push({
        row: i + 1, sku, title,
        status: errors.length > 0 ? "invalid" : "new",
        changes: [], errors,
        media: { ...mediaInfo, status: errors.length > 0 ? "missing" : mediaStatus },
      });
      continue;
    }

    if (errors.length > 0) {
      results.push({
        row: i + 1, sku, title, status: "conflict",
        changes: [], errors,
        media: { ...mediaInfo, status: mediaStatus },
      });
      continue;
    }

    const oldTitle = String(existingProduct.title_et ?? "");
    const oldPrice = Number(existingProduct.price ?? 0);
    const oldStock = Number(existingProduct.stock ?? 0);

    if (priceField && row[priceField] != null) {
      const newPrice = parseFloat(String(row[priceField]).replace(",", "."));
      if (!isNaN(newPrice) && Math.abs(newPrice - oldPrice) > 0.001) {
        changes.push({ field: "price", before: oldPrice, after: newPrice });
      }
    }

    if (stockField && row[stockField] != null) {
      const newStock = parseInt(String(row[stockField]), 10);
      if (!isNaN(newStock) && newStock !== oldStock) {
        changes.push({ field: "stock", before: oldStock, after: newStock });
      }
    }

    if (oldTitle !== title && !oldTitle.toLowerCase().includes(title.toLowerCase()) && !title.toLowerCase().includes(oldTitle.toLowerCase())) {
      changes.push({ field: "title_et", before: oldTitle, after: title });
    }

<<<<<<< HEAD
    const salePriceFieldC = mapping.sale_price || mapping.salePrice || null;
    if (salePriceFieldC && row[salePriceFieldC] != null) {
      const newSp = parseFloat(String(row[salePriceFieldC]).replace(",", "."));
      const oldSp = existingProduct.sale_price != null ? Number(existingProduct.sale_price) : null;
      if (!isNaN(newSp) && newSp !== oldSp) {
        changes.push({ field: "sale_price", before: oldSp ?? "", after: newSp });
      }
    }

    const bindingFieldC = mapping.binding || null;
    if (bindingFieldC && row[bindingFieldC] != null) {
      const newVal = String(row[bindingFieldC]).trim();
      const oldVal = String(existingProduct.binding ?? "");
      if (newVal !== oldVal) {
        changes.push({ field: "binding", before: oldVal, after: newVal });
      }
    }

    const pagesFieldC = mapping.pages || null;
    if (pagesFieldC && row[pagesFieldC] != null) {
      const newVal = parseInt(String(row[pagesFieldC]), 10);
      const oldVal = existingProduct.pages != null ? Number(existingProduct.pages) : null;
      if (!isNaN(newVal) && newVal !== oldVal) {
        changes.push({ field: "pages", before: oldVal ?? "", after: newVal });
      }
    }

    const releaseDateFieldC = mapping.release_date || mapping.releaseDate || null;
    if (releaseDateFieldC && row[releaseDateFieldC] != null) {
      const newVal = String(row[releaseDateFieldC]).trim();
      const oldVal = String(existingProduct.release_date ?? "");
      if (newVal !== oldVal) {
        changes.push({ field: "release_date", before: oldVal, after: newVal });
      }
    }

    const originFieldC = mapping.origin || null;
    if (originFieldC && row[originFieldC] != null) {
      const raw = String(row[originFieldC]).toLowerCase();
      const newVal = raw.includes("eesti") ? "estonian" : "foreign";
      const oldVal = String(existingProduct.origin ?? "estonian");
      if (newVal !== oldVal) {
        changes.push({ field: "origin", before: oldVal, after: newVal });
      }
    }

    const isArchivedFieldC = mapping.is_archived || mapping.isArchived || null;
    if (isArchivedFieldC && row[isArchivedFieldC] != null) {
      const raw = String(row[isArchivedFieldC]).toLowerCase();
      const newVal = raw === "x" || raw === "true" || raw === "yes" || raw === "jah";
      if (newVal !== Boolean(existingProduct.is_archived)) {
        changes.push({ field: "is_archived", before: String(existingProduct.is_archived), after: String(newVal) });
      }
    }

=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
    if (mediaStatus === "replace" || mediaStatus === "new") {
      changes.push({ field: "cover_image", before: existingProduct.cover_image || "", after: mediaInfo.sourceFile || "(uus fail)" });
    }

    const hasChanges = changes.length > 0;
    results.push({
      row: i + 1, sku, title,
      status: hasChanges ? "update" : "unchanged",
      changes, errors: [],
      media: { ...mediaInfo, status: hasChanges ? mediaStatus : (mediaStatus === "replace" || mediaStatus === "new" ? mediaStatus : "unchanged") },
    });
  }

  return { success: true, results };
}

export async function applyImport(_state: unknown, formData: FormData): Promise<{
  success?: boolean;
  applied?: number;
  error?: string;
  batchId?: string;
}> {
  const session = await requireAdminSession(["admin"]);
  const raw = JSON.parse(formData.get("payload") as string);
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vigane sisend." };

  const { rows, mapping, archiveBase64 } = parsed.data;
  const skuField = mapping.sku || "isbn";
  const titleField = mapping.title || "title";
  const priceField = mapping.price || "price";
  const stockField = mapping.stock || "stock";
  const descField = mapping.description || "description";

  let archiveEntries: Map<string, { buffer: Buffer; name: string }> = new Map();
  if (archiveBase64) {
    try {
      archiveEntries = await parseZipEntries(archiveBase64);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "ZIP-arhiivi töötlemine ebaõnnestus" };
    }
  }

<<<<<<< HEAD
    const coverCol = findCoverColumn(mapping);
    const db = createAdminClient();
    const batchId = crypto.randomUUID();
    let applied = 0;
    let mediaProcessed = 0;
    const mediaErrors: string[] = [];
    const coverChanges: Array<{ sku: string; before: string | null; after: string | null }> = [];

    const catField = mapping.categories || null;
    const authorField = mapping.authors || mapping["Toote Autor"] || null;
    const translatorField = mapping.translators || mapping["Toote Tõlk"] || null;
    const designerField = mapping.designers || mapping["Toote Disainer"] || mapping["Toote Kujundaja"] || null;
    const illustratorField = mapping.illustrators || mapping["Toote Illustreerija"] || null;
    const editorField = mapping.editors || mapping["Toote Toimetaja"] || null;
    const seriesField = mapping.series || mapping["Toote Sari"] || null;
    const salePriceField = mapping.sale_price || mapping.salePrice || null;
    const bindingField = mapping.binding || null;
    const pagesField = mapping.pages || null;
    const releaseDateField = mapping.release_date || mapping.releaseDate || null;
    const originField = mapping.origin || null;
    const isArchivedField = mapping.is_archived || mapping.isArchived || null;
    const saleStartField = mapping.sale_start || mapping.saleStart || null;
    const saleEndField = mapping.sale_end || mapping.saleEnd || null;

    // Pre-fetch taxonomy lookup maps
    const catLookup = new Map<string, string>();
    const seriesLookup = new Map<string, string>();
    const personLookup = new Map<string, string>();

    const fieldExists = catField || authorField || translatorField || designerField || illustratorField || editorField || seriesField;

    if (fieldExists) {
      const { data: allCats } = await db.schema("commerce").from("categories").select("id, name_et");
      if (allCats) for (const c of allCats as Record<string, unknown>[]) catLookup.set(String(c.name_et ?? ""), String(c.id));

      const sAll = [];
      let sFrom = 0;
      while (true) {
        const { data } = await db.schema("content").from("series").select("id, name_et").range(sFrom, sFrom + 999);
        if (!data || data.length === 0) break;
        sAll.push(...data as Record<string, unknown>[]);
        if (data.length < 1000) break;
        sFrom += 1000;
      }
      for (const s of sAll) seriesLookup.set(String(s.name_et ?? ""), String(s.id));

      const pAll = [];
      let pFrom = 0;
      while (true) {
        const { data } = await db.schema("people").from("people").select("id, name, slug").range(pFrom, pFrom + 999);
        if (!data || data.length === 0) break;
        pAll.push(...data as Record<string, unknown>[]);
        if (data.length < 1000) break;
        pFrom += 1000;
      }
      for (const p of pAll) {
        personLookup.set(String(p.name ?? ""), String(p.id));
        personLookup.set(String(p.slug ?? ""), String(p.id));
      }
    }

    // Pre-fetch existing product_people to avoid duplicates
    const existingPp = new Map<string, Set<string>>();
    if (authorField || translatorField || designerField || illustratorField || editorField) {
      const ppAll = [];
      let ppFrom = 0;
      while (true) {
        const { data } = await db.schema("commerce").from("product_people").select("product_id, person_id, role").range(ppFrom, ppFrom + 999);
        if (!data || data.length === 0) break;
        ppAll.push(...data as Record<string, unknown>[]);
        if (data.length < 1000) break;
        ppFrom += 1000;
      }
      for (const pp of ppAll) {
        const key = `${pp.product_id}:${pp.person_id}:${pp.role}`;
        if (!existingPp.has(String(pp.product_id))) existingPp.set(String(pp.product_id), new Set());
        existingPp.get(String(pp.product_id))!.add(key);
      }
    }

    // Pre-fetch existing product_categories to avoid duplicates
    const existingPc = new Map<string, Set<string>>();
    if (catField) {
      const pcAll = [];
      let pcFrom = 0;
      while (true) {
        const { data } = await db.schema("commerce").from("product_categories").select("product_id, category_id").range(pcFrom, pcFrom + 999);
        if (!data || data.length === 0) break;
        pcAll.push(...data as Record<string, unknown>[]);
        if (data.length < 1000) break;
        pcFrom += 1000;
      }
      for (const pc of pcAll) {
        if (!existingPc.has(String(pc.product_id))) existingPc.set(String(pc.product_id), new Set());
        existingPc.get(String(pc.product_id))!.add(String(pc.category_id));
      }
    }

    const productIdsBySku = new Map<string, string>();
=======
  const coverCol = findCoverColumn(mapping);
  const db = createAdminClient();
  const batchId = crypto.randomUUID();
  let applied = 0;
  let mediaProcessed = 0;
  const mediaErrors: string[] = [];
  const coverChanges: Array<{ sku: string; before: string | null; after: string | null }> = [];
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

  for (const row of rows) {
    const sku = String(row[skuField] ?? "").trim();
    const title = String(row[titleField] ?? "").trim();
    if (!sku || !title) continue;

    const { data: existing } = await db.schema("commerce").from("products").select("id,cover_image").eq("sku", sku).maybeSingle() as { data: { id: string; cover_image: string | null } | null };
    const price = parseFloat(String(row[priceField] ?? "0").replace(",", "."));
    const stock = parseInt(String(row[stockField] ?? "0"), 10);
    const description = String(row[descField] ?? "").trim();

    const { entry } = matchCoverFromArchive(sku, coverCol, row, archiveEntries);
    let newCoverKey: string | null = null;
    const beforeCover = existing?.cover_image ?? null;

    if (entry) {
      try {
        const productId = existing?.id ?? crypto.randomUUID();
        const processed = await processImage(entry.buffer);
        const hash = createHash("sha256").update(processed.buffer).digest("hex");
        const objectKey = generateObjectKey(productId, hash);
        await uploadCover(processed.buffer, productId, hash);
        newCoverKey = objectKey;
        mediaProcessed++;
      } catch (err) {
        mediaErrors.push(`${sku}: ${err instanceof Error ? err.message : "Töötlemine ebaõnnestus"}`);
      }
    }

    try {
<<<<<<< HEAD
      let productId: string;
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      if (existing) {
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (!isNaN(price)) update.price = price;
        if (!isNaN(stock)) update.stock = Math.max(0, stock);
        if (description) update.description_et = sanitizeRichText(description);
        if (newCoverKey) update.cover_image = newCoverKey;

<<<<<<< HEAD
        if (salePriceField && row[salePriceField] != null) {
          const sp = parseFloat(String(row[salePriceField]).replace(",", "."));
          if (!isNaN(sp)) update.sale_price = sp;
        }
        if (saleStartField && row[saleStartField] != null) {
          const v = String(row[saleStartField]).trim();
          if (v) update.sale_start = v;
        }
        if (saleEndField && row[saleEndField] != null) {
          const v = String(row[saleEndField]).trim();
          if (v) update.sale_end = v;
        }
        if (bindingField && row[bindingField] != null) {
          const v = String(row[bindingField]).trim();
          if (v) update.binding = v;
        }
        if (pagesField && row[pagesField] != null) {
          const pn = parseInt(String(row[pagesField]), 10);
          if (!isNaN(pn)) update.pages = pn;
        }
        if (releaseDateField && row[releaseDateField] != null) {
          const v = String(row[releaseDateField]).trim();
          if (v) update.release_date = v;
        }
        if (originField && row[originField] != null) {
          const v = String(row[originField]).toLowerCase();
          if (v.includes("eesti")) update.origin = "estonian";
          else if (v) update.origin = "foreign";
        }
        if (isArchivedField && row[isArchivedField] != null) {
          const v = String(row[isArchivedField]).toLowerCase();
          update.is_archived = v === "x" || v === "true" || v === "yes" || v === "jah";
        }

        // Series
        if (seriesField && row[seriesField] != null) {
          const seriesName = String(row[seriesField]).trim();
          if (seriesName) {
            let sid = seriesLookup.get(seriesName);
            if (!sid) {
              const seriesSlug = slugify(seriesName);
              const { data: newSeries } = await db.schema("content").from("series")
                .upsert({ slug: seriesSlug, name_et: seriesName }, { onConflict: "slug" })
                .select("id").single();
              if (newSeries) { sid = String(newSeries.id); seriesLookup.set(seriesName, sid); }
            }
            update.series_id = sid || null;
          }
        }

        const { error: updErr } = await db.schema("commerce").from("products").update(update).eq("id", existing.id);
        if (updErr) throw new Error(`DB uuendamine ebaõnnestus: ${updErr.message}`);
        productId = existing.id;
      } else {
        let seriesId: string | null = null;
        if (seriesField && row[seriesField] != null) {
          const seriesName = String(row[seriesField]).trim();
          if (seriesName) {
            let sid = seriesLookup.get(seriesName);
            if (!sid) {
              const seriesSlug = slugify(seriesName);
              const { data: newSeries } = await db.schema("content").from("series")
                .upsert({ slug: seriesSlug, name_et: seriesName }, { onConflict: "slug" })
                .select("id").single();
              if (newSeries) { sid = String(newSeries.id); seriesLookup.set(seriesName, sid); }
            }
            seriesId = sid || null;
          }
        }

        let originVal = "estonian";
        if (originField && row[originField] != null) {
          const v = String(row[originField]).toLowerCase();
          if (!v.includes("eesti")) originVal = "foreign";
        }

        const insert: Record<string, unknown> = {
=======
        const { error: updErr } = await db.schema("commerce").from("products").update(update).eq("id", existing.id);
        if (updErr) throw new Error(`DB uuendamine ebaõnnestus: ${updErr.message}`);
      } else {
        const insert = {
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
          sku,
          title_et: title,
          slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          price: isNaN(price) ? 0 : price,
          stock: isNaN(stock) ? 0 : Math.max(0, stock),
          description_et: description ? sanitizeRichText(description) : null,
<<<<<<< HEAD
          origin: originVal,
          cover_image: newCoverKey || null,
          series_id: seriesId,
          updated_at: new Date().toISOString(),
        };

        if (salePriceField && row[salePriceField] != null) {
          const sp = parseFloat(String(row[salePriceField]).replace(",", "."));
          if (!isNaN(sp)) insert.sale_price = sp;
        }
        if (saleStartField && row[saleStartField] != null) {
          const v = String(row[saleStartField]).trim();
          if (v) insert.sale_start = v;
        }
        if (saleEndField && row[saleEndField] != null) {
          const v = String(row[saleEndField]).trim();
          if (v) insert.sale_end = v;
        }
        if (bindingField && row[bindingField] != null) {
          const v = String(row[bindingField]).trim();
          if (v) insert.binding = v;
        }
        if (pagesField && row[pagesField] != null) {
          const pn = parseInt(String(row[pagesField]), 10);
          if (!isNaN(pn)) insert.pages = pn;
        }
        if (releaseDateField && row[releaseDateField] != null) {
          const v = String(row[releaseDateField]).trim();
          if (v) insert.release_date = v;
        }
        if (isArchivedField && row[isArchivedField] != null) {
          const v = String(row[isArchivedField]).toLowerCase();
          insert.is_archived = v === "x" || v === "true" || v === "yes" || v === "jah";
        }

        const { data: inserted, error: insErr } = await db.schema("commerce").from("products").insert(insert).select("id,slug").single();
        if (insErr) throw new Error(`DB lisamine ebaõnnestus: ${insErr.message}`);
        productId = String(inserted.id);
      }

      productIdsBySku.set(sku, productId);

      // --- Categories ---
      if (catField && row[catField] != null) {
        const catNames = parsePipeList(String(row[catField]));
        const pcSet = existingPc.get(productId) || new Set();
        for (const name of catNames) {
          const cid = catLookup.get(name);
          if (!cid) continue;
          if (pcSet.has(cid)) continue;
          await db.schema("commerce").from("product_categories").upsert(
            { product_id: productId, category_id: cid },
            { onConflict: "product_id,category_id", ignoreDuplicates: true }
          ).maybeSingle();
          pcSet.add(cid);
        }
        if (!existingPc.has(productId)) existingPc.set(productId, pcSet);
      }

      // --- People ---
      const peopleRoles: Array<{ field: string | null; role: string }> = [
        { field: authorField, role: "author" },
        { field: translatorField, role: "translator" },
        { field: designerField, role: "designer" },
        { field: illustratorField, role: "illustrator" },
        { field: editorField, role: "editor" },
      ];

      const ppSet = existingPp.get(productId) || new Set();
      for (const { field, role } of peopleRoles) {
        if (!field || row[field] == null) continue;
        const names = parsePipeList(String(row[field]));
        for (const name of names) {
          let pid = personLookup.get(name) || personLookup.get(slugify(name));
          if (!pid) {
            const personSlug = slugify(name);
            const { data: newPerson } = await db.schema("people").from("people")
              .upsert({ slug: personSlug, name }, { onConflict: "slug" })
              .select("id").single();
            if (newPerson) {
              pid = String(newPerson.id);
              personLookup.set(name, pid);
              personLookup.set(personSlug, pid);
            }
          }
          if (!pid) continue;
          const key = `${productId}:${pid}:${role}`;
          if (ppSet.has(key)) continue;
          await db.schema("commerce").from("product_people").upsert(
            { product_id: productId, person_id: pid, role },
            { onConflict: "product_id,person_id,role", ignoreDuplicates: true }
          ).maybeSingle();
          ppSet.add(key);
        }
      }
      if (!existingPp.has(productId)) existingPp.set(productId, ppSet);

=======
          origin: "estonian" as const,
          cover_image: newCoverKey || null,
          updated_at: new Date().toISOString(),
        };

        const { data: inserted, error: insErr } = await db.schema("commerce").from("products").insert(insert).select("id,slug").single();
        if (insErr) throw new Error(`DB lisamine ebaõnnestus: ${insErr.message}`);
      }

>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      if (newCoverKey !== beforeCover) {
        coverChanges.push({ sku, before: beforeCover, after: newCoverKey });
      }
      applied++;
    } catch (err) {
      if (newCoverKey && !beforeCover) {
        try {
          const { removeUnreferencedObject } = await import("@/lib/media");
          await removeUnreferencedObject(newCoverKey);
<<<<<<< HEAD
        } catch (cleanupErr) {
          console.error("import cleanup: failed to remove orphaned upload", newCoverKey, cleanupErr);
        }
=======
        } catch {}
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
      }
      mediaErrors.push(`${sku}: ${err instanceof Error ? err.message : "Salvestamine ebaõnnestus"}`);
    }
  }

  await audit(session.user.id, "import.applied", "commerce.product", batchId, {
    after: {
      count: applied,
      mediaProcessed,
      mediaErrors: mediaErrors.length,
      coverChanges: coverChanges.map((c) => ({ sku: c.sku, before: c.before ?? "", after: c.after ?? "" })),
    },
    correlationId: batchId,
  });

  revalidatePath("/");
  revalidatePath("/raamatud");
  revalidatePath("/arhiiv");
  revalidatePath("/sarjad");

  return {
    success: true,
    applied,
    batchId,
  };
}
