"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { sanitizeRichText } from "@/lib/sanitize";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const rowSchema = z.record(z.string(), z.any());
const importSchema = z.object({
  rows: z.array(rowSchema),
  mode: z.enum(["full", "partial", "stock", "price"]),
  mapping: z.record(z.string(), z.string()),
});

export async function compareImport(_state: unknown, formData: FormData): Promise<{ success?: boolean; results?: Array<{ row: number; sku: string; title: string; status: "new" | "update" | "unchanged" | "conflict" | "invalid"; changes: Array<{ field: string; before: unknown; after: unknown }>; errors: string[] }>; error?: string }> {
  await requireAdminSession(["admin"]);
  const raw = JSON.parse(formData.get("payload") as string);
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vigane sisend." };

  const { rows, mapping } = parsed.data;
  const skuField = mapping.sku || "isbn";
  const titleField = mapping.title || "title";
  const priceField = mapping.price || "price";
  const stockField = mapping.stock || "stock";

  const db = createAdminClient();
  interface ExistingProduct { id: string; sku: string; title_et: string; price: number; sale_price: number | null; stock: number; }
  const { data: existing } = await db.schema("commerce").from("products").select("id,sku,title_et,price,sale_price,stock");
  const existingBySku = new Map<string, ExistingProduct>();
  if (existing) {
    for (const p of existing as ExistingProduct[]) {
      if (p.sku) existingBySku.set(String(p.sku).trim().toUpperCase(), p);
    }
  }

  const results: Array<{ row: number; sku: string; title: string; status: "new" | "update" | "unchanged" | "conflict" | "invalid"; changes: Array<{ field: string; before: unknown; after: unknown }>; errors: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sku = String(row[skuField] ?? "").trim();
    const title = String(row[titleField] ?? "").trim();
    const errors: string[] = [];

    if (!sku) { results.push({ row: i + 1, sku: "", title, status: "invalid", changes: [], errors: ["ISBN puudub"] }); continue; }
    if (!title) errors.push("Pealkiri puudub");

    const existingProduct = existingBySku.get(sku.toUpperCase());
    const changes: Array<{ field: string; before: unknown; after: unknown }> = [];

    if (!existingProduct) {
      if (errors.length > 0) {
        results.push({ row: i + 1, sku, title, status: "invalid", changes: [], errors });
      } else {
        results.push({ row: i + 1, sku, title, status: "new", changes: [], errors: [] });
      }
      continue;
    }

    if (errors.length > 0) {
      results.push({ row: i + 1, sku, title, status: "conflict", changes: [], errors });
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

    if (changes.length === 0) {
      results.push({ row: i + 1, sku, title, status: "unchanged", changes: [], errors: [] });
    } else {
      results.push({ row: i + 1, sku, title, status: "update", changes, errors: [] });
    }
  }

  return { success: true, results };
}

export async function applyImport(_state: unknown, formData: FormData): Promise<{ success?: boolean; applied?: number; error?: string; batchId?: string }> {
  const session = await requireAdminSession(["admin"]);
  const raw = JSON.parse(formData.get("payload") as string);
  const parsed = importSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Vigane sisend." };

  const { rows, mapping } = parsed.data;
  const skuField = mapping.sku || "isbn";
  const titleField = mapping.title || "title";
  const priceField = mapping.price || "price";
  const stockField = mapping.stock || "stock";
  const descField = mapping.description || "description";

  const db = createAdminClient();
  const batchId = crypto.randomUUID();
  let applied = 0;

  for (const row of rows) {
    const sku = String(row[skuField] ?? "").trim();
    const title = String(row[titleField] ?? "").trim();
    if (!sku || !title) continue;

    const { data: existing } = await db.schema("commerce").from("products").select("id").eq("sku", sku).maybeSingle();
    const price = parseFloat(String(row[priceField] ?? "0").replace(",", "."));
    const stock = parseInt(String(row[stockField] ?? "0"), 10);
    const description = String(row[descField] ?? "").trim();

    if (existing) {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (!isNaN(price)) update.price = price;
      if (!isNaN(stock)) update.stock = Math.max(0, stock);
      if (description) update.description_et = sanitizeRichText(description);
      await db.schema("commerce").from("products").update(update).eq("id", existing.id);
    } else {
      await db.schema("commerce").from("products").insert({
        sku,
        title_et: title,
        slug: sku.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        price: isNaN(price) ? 0 : price,
        stock: isNaN(stock) ? 0 : Math.max(0, stock),
        description_et: description ? sanitizeRichText(description) : null,
        origin: "estonian",
        updated_at: new Date().toISOString(),
      });
    }
    applied++;
  }

  await audit(session.user.id, "import.applied", "commerce.product", batchId, {
    after: { count: applied },
    correlationId: batchId,
  });

  revalidatePath("/raamatud");
  return { success: true, applied, batchId };
}
