"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";

const bulkActionSchema = z.object({
  ids: z.string().min(1),
  action: z.enum([
    "set_state_active", "set_state_upcoming", "archive", "unarchive",
    "set_price", "set_sale_price", "clear_sale_price",
    "set_stock", "adjust_stock",
    "set_origin", "set_featured", "clear_featured",
  ]),
  value: z.string().optional(),
});

export async function bulkEditProducts(_state: { error?: string; result?: Record<string, unknown> } | undefined, formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = bulkActionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli sisendit." };

  const { ids, action, value } = parsed.data;
  const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
  if (idList.length === 0) return { error: "Vali \u00fcks v\u00f5i enam toodet." };

  const db = createAdminClient();
  const batchId = crypto.randomUUID();
  const results: { updated: number; skipped: number; errors: string[] } = { updated: 0, skipped: 0, errors: [] };
  const fieldChanges: Record<string, unknown> = {};

  for (const id of idList) {
    try {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

      switch (action) {
        case "set_state_active":
          update.is_archived = false;
          update.is_upcoming = false;
          break;
        case "set_state_upcoming":
          update.is_archived = false;
          update.is_upcoming = true;
          break;
        case "archive":
          update.is_archived = true;
          break;
        case "unarchive":
          update.is_archived = false;
          break;
        case "set_price":
          if (value != null) update.price = Number(value);
          break;
        case "set_sale_price":
          update.sale_price = value && value !== "clear" ? Number(value) : null;
          break;
        case "clear_sale_price":
          update.sale_price = null;
          update.sale_start = null;
          update.sale_end = null;
          break;
        case "set_stock":
          if (value != null) update.stock = Math.max(0, parseInt(value, 10) || 0);
          break;
        case "adjust_stock":
          if (value != null) {
            const { data: current } = await db.schema("commerce").from("products").select("stock").eq("id", id).single();
            const currentStock = Number(current?.stock ?? 0);
            update.stock = Math.max(0, currentStock + parseInt(value, 10));
          }
          break;
        case "set_origin":
          if (value === "estonian" || value === "foreign") update.origin = value;
          break;
        case "set_featured":
          update.is_featured = true;
          break;
        case "clear_featured":
          update.is_featured = false;
          break;
      }

      const { error } = await db.schema("commerce").from("products").update(update).eq("id", id);
      if (error) {
        results.errors.push(`${id}: ${error.message}`);
      } else {
        results.updated++;
        fieldChanges[action] = value ?? true;
      }
    } catch (err) {
      results.errors.push(`${id}: ${String(err)}`);
    }
  }

  await audit(session.user.id, `products.bulk.${action}`, "commerce.product", batchId, {
    after: { count: results.updated, action, fields: fieldChanges },
    correlationId: batchId,
  });

  revalidatePath("/raamatud");

  return {
    result: {
      batchId,
      action,
      total: idList.length,
      updated: results.updated,
      skipped: results.skipped,
      errors: results.errors.slice(0, 10),
      fieldChanges,
    },
  };
}

export async function searchProducts(query: string, limit = 100): Promise<Array<{ id: string; sku: string; title_et: string; price: number; stock: number; is_archived: boolean; is_upcoming: boolean }>> {
  await requireAdminSession(["editor", "admin"]);
  const db = createAdminClient();
  const q = query.trim();
  let builder = db.schema("commerce").from("products").select("id,sku,title_et,price,stock,is_archived,is_upcoming").limit(limit);
  if (q) {
    builder = builder.or(`title_et.ilike.%${q}%,sku.ilike.%${q}%`);
  }
  const { data } = await builder.order("title_et", { ascending: true });
  return (data ?? []) as Array<{ id: string; sku: string; title_et: string; price: number; stock: number; is_archived: boolean; is_upcoming: boolean }>;
}
