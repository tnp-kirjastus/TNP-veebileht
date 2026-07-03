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

interface ExistingProduct {
  id: string;
  sku: string;
  slug: string;
  title_et: string;
  price: number;
  sale_price: number | null;
  stock: number;
  cover_image: string | null;
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
  const { data: existing } = await db.schema("commerce").from("products").select("id,sku,slug,title_et,price,sale_price,stock,cover_image");
  const existingBySku = new Map<string, ExistingProduct>();
  if (existing) {
    for (const p of existing as ExistingProduct[]) {
      if (p.sku) existingBySku.set(String(p.sku).trim().toUpperCase(), p);
    }
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
    let mediaInfo: {
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

  const coverCol = findCoverColumn(mapping);
  const db = createAdminClient();
  const batchId = crypto.randomUUID();
  let applied = 0;
  let mediaProcessed = 0;
  const mediaErrors: string[] = [];
  const coverChanges: Array<{ sku: string; before: string | null; after: string | null }> = [];

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
      if (existing) {
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (!isNaN(price)) update.price = price;
        if (!isNaN(stock)) update.stock = Math.max(0, stock);
        if (description) update.description_et = sanitizeRichText(description);
        if (newCoverKey) update.cover_image = newCoverKey;

        const { error: updErr } = await db.schema("commerce").from("products").update(update).eq("id", existing.id);
        if (updErr) throw new Error(`DB uuendamine ebaõnnestus: ${updErr.message}`);
      } else {
        const insert = {
          sku,
          title_et: title,
          slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          price: isNaN(price) ? 0 : price,
          stock: isNaN(stock) ? 0 : Math.max(0, stock),
          description_et: description ? sanitizeRichText(description) : null,
          origin: "estonian" as const,
          cover_image: newCoverKey || null,
          updated_at: new Date().toISOString(),
        };

        const { data: inserted, error: insErr } = await db.schema("commerce").from("products").insert(insert).select("id,slug").single();
        if (insErr) throw new Error(`DB lisamine ebaõnnestus: ${insErr.message}`);
      }

      if (newCoverKey !== beforeCover) {
        coverChanges.push({ sku, before: beforeCover, after: newCoverKey });
      }
      applied++;
    } catch (err) {
      if (newCoverKey && !beforeCover) {
        try {
          const { removeUnreferencedObject } = await import("@/lib/media");
          await removeUnreferencedObject(newCoverKey);
        } catch {}
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
