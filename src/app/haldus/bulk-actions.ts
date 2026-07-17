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
  if (idList.length === 0) return { error: "Vali uks voi enam toodet." };

  const db = createAdminClient();
  const batchId = crypto.randomUUID();
  const fieldChanges: Record<string, unknown> = {};

  try {
    const baseUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };

    switch (action) {
      case "set_state_active":
        baseUpdate.is_archived = false;
        baseUpdate.is_upcoming = false;
        break;
      case "set_state_upcoming":
        baseUpdate.is_archived = false;
        baseUpdate.is_upcoming = true;
        break;
      case "archive":
        baseUpdate.is_archived = true;
        break;
      case "unarchive":
        baseUpdate.is_archived = false;
        break;
      case "set_price":
        if (value != null) baseUpdate.price = Number(value);
        break;
      case "set_sale_price":
        baseUpdate.sale_price = value && value !== "clear" ? Number(value) : null;
        break;
      case "clear_sale_price":
        baseUpdate.sale_price = null;
        baseUpdate.sale_start = null;
        baseUpdate.sale_end = null;
        break;
      case "set_stock":
        if (value != null) baseUpdate.stock = Math.max(0, parseInt(value, 10) || 0);
        break;
      case "adjust_stock":
        {
          const delta = parseInt(value ?? "0", 10);
          if (delta !== 0) {
            let updated = 0;
            for (const id of idList) {
              const { data: current } = await db.schema("commerce").from("products")
                .select("stock").eq("id", id).single();
              const currentStock = Number(current?.stock ?? 0);
              const newStock = Math.max(0, currentStock + delta);
              const { error } = await db.schema("commerce").from("products")
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq("id", id);
              if (error) {
                console.error("bulk adjust_stock error:", id, error.message);
              } else {
                updated++;
              }
            }
            fieldChanges[action] = value;
            await audit(session.user.id, `products.bulk.${action}`, "commerce.product", batchId, {
              after: { count: updated, action, fields: fieldChanges },
              correlationId: batchId,
            });
            revalidatePath("/raamatud");
            return { result: { batchId, action, total: idList.length, updated, skipped: 0, errors: [], fieldChanges } };
          }
        }
        return { result: { batchId, action, total: idList.length, updated: 0, skipped: 0, errors: [], fieldChanges } };
      case "set_origin":
        if (value === "estonian" || value === "foreign") baseUpdate.origin = value;
        break;
      case "set_featured":
        baseUpdate.is_featured = true;
        break;
      case "clear_featured":
        baseUpdate.is_featured = false;
        break;
    }

    const { error } = await db.schema("commerce").from("products")
      .update(baseUpdate)
      .in("id", idList);

    if (error) {
      console.error("bulkEditProducts batch error:", error);
      return { error: "Muutmine ebaonnestus. Proovi uuesti." };
    }

    fieldChanges[action] = value ?? true;
    await audit(session.user.id, `products.bulk.${action}`, "commerce.product", batchId, {
      after: { count: idList.length, action, fields: fieldChanges },
      correlationId: batchId,
    });

    revalidatePath("/raamatud");
    return { result: { batchId, action, total: idList.length, updated: idList.length, skipped: 0, errors: [], fieldChanges } };
  } catch (err) {
    console.error("bulkEditProducts exception:", err);
    return { error: "Muutmine ebaonnestus. Proovi uuesti." };
  }

  return { result: { batchId, action, total: idList.length, updated: 0, skipped: 0, errors: [], fieldChanges } };
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
