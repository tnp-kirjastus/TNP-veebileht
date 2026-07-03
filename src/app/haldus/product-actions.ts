"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { sanitizeRichText } from "@/lib/sanitize";
import { audit } from "@/lib/audit";
import { revalidateProduct } from "@/lib/revalidate";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(3).max(50),
  title_et: z.string().trim().min(1).max(300),
  title_en: z.string().trim().max(300).optional(),
  slug: z.string().trim().min(3).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description_et: z.string().trim().max(50_000).optional(),
  description_en: z.string().trim().max(50_000).optional(),
  price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0).optional(),
  sale_start: z.string().optional(),
  sale_end: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  binding: z.string().trim().max(100).optional(),
  pages: z.coerce.number().int().min(0).optional(),
  release_date: z.string().optional(),
  origin: z.enum(["estonian", "foreign"]).default("estonian"),
  is_upcoming: z.coerce.boolean().optional(),
  is_archived: z.coerce.boolean().optional(),
  is_featured: z.coerce.boolean().optional(),
  cover_image: z.string().trim().max(1000).optional(),
  series_id: z.string().uuid().optional(),
  category_ids: z.string().optional(),
  people_authors: z.string().optional(),
  people_translators: z.string().optional(),
  people_editors: z.string().optional(),
  people_designers: z.string().optional(),
  people_illustrators: z.string().optional(),
  seo_title: z.string().trim().max(70).optional(),
  seo_description: z.string().trim().max(170).optional(),
  status: z.enum(["draft", "active", "upcoming", "archived"]).default("active"),
});

function parsePersonList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function saveProduct(_state: { error?: string; productId?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju.";
    return { error: msg };
  }

  const v = parsed.data;
  const db = createAdminClient();

  const coverImageRaw = v.cover_image?.trim();
  const coverImageFinal = coverImageRaw === "[CLEAR]" ? null : (coverImageRaw || null);

  const productRecord = {
    sku: v.sku,
    title_et: v.title_et,
    title_en: v.title_en || null,
    slug: v.slug,
    description_et: v.description_et ? sanitizeRichText(v.description_et) : null,
    description_en: v.description_en || null,
    price: v.price,
    sale_price: v.sale_price ?? null,
    sale_start: v.sale_start || null,
    sale_end: v.sale_end || null,
    stock: v.stock,
    binding: v.binding || null,
    pages: v.pages ?? null,
    release_date: v.release_date || null,
    origin: v.origin,
    is_upcoming: v.is_upcoming ?? false,
    is_archived: v.is_archived ?? false,
    is_featured: v.is_featured ?? false,
    cover_image: coverImageFinal,
    series_id: v.series_id || null,
    updated_at: new Date().toISOString(),
  };

  const result = v.id
    ? await db.schema("commerce").from("products").update(productRecord).eq("id", v.id).select("id,slug").single()
    : await db.schema("commerce").from("products").insert(productRecord).select("id,slug").single();

  if (result.error) {
    if (result.error.code === "23505") return { error: `Unikaalne v\u00e4li on juba kasutusel (ISBN v\u00f5i URL-i nimi).` };
    return { error: `Salvestamine eba\u00f5nnestus: ${result.error.message}` };
  }

  const productId = result.data.id;
  const productSlug = result.data.slug;

  if (v.category_ids) {
    const catIds = parsePersonList(v.category_ids);
    await db.schema("commerce").from("product_categories").delete().eq("product_id", productId);
    if (catIds.length > 0) {
      const catRows = catIds.map((catId) => ({ product_id: productId, category_id: catId }));
      await db.schema("commerce").from("product_categories").insert(catRows);
    }
  }

  if (v.series_id) {
    await db.schema("commerce").from("products").update({ series_id: v.series_id }).eq("id", productId);
  }

  const personRoles = [
    { key: "people_authors", role: "author" },
    { key: "people_translators", role: "translator" },
    { key: "people_editors", role: "editor" },
    { key: "people_designers", role: "designer" },
    { key: "people_illustrators", role: "illustrator" },
  ];

  await db.schema("commerce").from("product_people").delete().eq("product_id", productId);

  for (const { key, role } of personRoles) {
    const names = parsePersonList(raw[key] as string);
    for (const name of names) {
      const { data: person } = await db.schema("people").from("people").select("id").eq("name", name).maybeSingle();
      if (person) {
        await db.schema("commerce").from("product_people").insert({ product_id: productId, person_id: person.id, role });
      }
    }
  }

  await audit(session.user.id, v.id ? "product.updated" : "product.created", "commerce.product", productId, {
    after: { title: v.title_et, sku: v.sku, slug: productSlug, cover_image: String(coverImageFinal ?? "") },
  });

  revalidateProduct(productSlug);

  return { success: true, productId };
}

export async function archiveProduct(formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("commerce").from("products").update({ is_archived: true, updated_at: new Date().toISOString() }).eq("id", id).select("title_et,slug").single();
  if (data) {
    await audit(session.user.id, "product.archived", "commerce.product", id, { after: { title: data.title_et } });
    revalidateProduct(data.slug);
  }
}

export async function unarchiveProduct(formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("commerce").from("products").update({ is_archived: false, updated_at: new Date().toISOString() }).eq("id", id).select("title_et,slug").single();
  if (data) {
    await audit(session.user.id, "product.unarchived", "commerce.product", id, { after: { title: data.title_et } });
    revalidateProduct(data.slug);
  }
}
