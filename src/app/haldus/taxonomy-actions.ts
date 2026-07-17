"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { revalidateCampaign, revalidateSeries } from "@/lib/revalidate";

const campaignSchema = z.object({
  id: z.string().uuid().optional(),
  name_et: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description_et: z.string().trim().max(5000).optional(),
  banner_url: z.string().trim().max(500).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  product_ids: z.array(z.string().uuid()).optional(),
});

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "kampaania";
}

async function uniqueCampaignSlug(db: ReturnType<typeof createAdminClient>, name: string) {
  const base = slugify(name);
  let slug = base;
  let i = 2;

  while (true) {
    const { data, error } = await db
      .schema("content")
      .from("campaigns")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name_et: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parent_id: z.string().uuid().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

const seriesSchema = z.object({
  id: z.string().uuid().optional(),
  name_et: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description_et: z.string().trim().max(5000).optional(),
  cover_image: z.string().trim().max(500).optional(),
});

const personSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  bio_et: z.string().trim().max(5000).optional(),
});

export async function saveCampaign(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const productIds = [...new Set(formData.getAll("product_ids").map(String))];
  const parsed = campaignSchema.safeParse({
    ...raw,
    product_ids: productIds,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record: Record<string, unknown> = {
    name_et: v.name_et, description_et: v.description_et || null,
    banner_url: v.banner_url || null,
    starts_at: v.starts_at || null, ends_at: v.ends_at || null,
    is_active: v.is_active ?? true,
  };

  if (v.slug) {
    record.slug = v.slug;
  } else if (!v.id) {
    try {
      record.slug = await uniqueCampaignSlug(db, v.name_et);
    } catch {
      return { error: "Kampaania URL-i nime loomine ebaõnnestus." };
    }
  }
  const result = v.id
    ? await db.schema("content").from("campaigns").update(record).eq("id", v.id).select("id").single()
    : await db.schema("content").from("campaigns").insert(record).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine ebaõnnestus." };
  const campaignId = result.data.id as string;
  const { data: existingRows, error: existingError } = await db
    .schema("content")
    .from("campaign_products")
    .select("product_id")
    .eq("campaign_id", campaignId);

  if (existingError) return { error: "Kampaania toodete kontroll ebaõnnestus." };

  const savedProductIds = new Set((existingRows ?? []).map((row) => String(row.product_id)));
  const selectedProductIds = new Set(productIds);
  const newlyAddedProductIds = productIds.filter((pid) => !savedProductIds.has(pid));
  const removedProductIds = [...savedProductIds].filter((pid) => !selectedProductIds.has(pid));

  if (newlyAddedProductIds.length > 0) {
    const cpRows = newlyAddedProductIds.map((pid) => ({ campaign_id: campaignId, product_id: pid }));
    const { error: productsError } = await db
      .schema("content")
      .from("campaign_products")
      .insert(cpRows);

    if (productsError) return { error: "Kampaania toodete salvestamine ebaõnnestus." };
  }

  if (removedProductIds.length > 0) {
    const { error: productsError } = await db
      .schema("content")
      .from("campaign_products")
      .delete()
      .eq("campaign_id", campaignId)
      .in("product_id", removedProductIds);

    if (productsError) return { error: "Toodete eemaldamine kampaaniast ebaõnnestus." };
  }

  if (newlyAddedProductIds.length > 0) {
    const saleUpdates: Record<string, unknown> = {};
    if (v.starts_at) saleUpdates.sale_start = v.starts_at;
    if (v.ends_at) saleUpdates.sale_end = v.ends_at;

    if (Object.keys(saleUpdates).length > 0) {
      for (const pid of newlyAddedProductIds) {
        const { data: prod } = await db.schema("commerce").from("products")
          .select("price").eq("id", pid).maybeSingle();
        if (prod) {
          const currentPrice = Number(prod.price ?? 0);
          const discountedPrice = Math.round(currentPrice * 0.85 * 100) / 100;
          await db.schema("commerce").from("products").update({
            sale_price: discountedPrice,
            ...saleUpdates,
          }).eq("id", pid);
        }
      }
    }
  }

  await audit(session.user.id, v.id ? "campaign.updated" : "campaign.created", "content.campaign", result.data.id, { after: { name: v.name_et } });
  revalidateCampaign();
  revalidatePath("/haldus/kampaaniad");
  return { success: true, id: result.data.id };
}

const removeProductsSchema = z.object({
  campaign_id: z.string().uuid(),
  product_ids: z.array(z.string().uuid()),
});

const toggleCampaignActiveSchema = z.object({
  campaign_id: z.string().uuid(),
  is_active: z.coerce.boolean(),
});

export async function removeProductsFromCampaign(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const productIds = formData.getAll("product_ids").map(String);
  const parsed = removeProductsSchema.safeParse({ campaign_id: raw.campaign_id, product_ids: productIds });
  if (!parsed.success) return { error: "Kontrolli välju." };
  const v = parsed.data;
  const db = createAdminClient();
  await db.schema("content").from("campaign_products").delete()
    .eq("campaign_id", v.campaign_id)
    .in("product_id", v.product_ids);
  await audit(session.user.id, "campaign.products_removed", "content.campaign", v.campaign_id);
  revalidateCampaign();
  revalidatePath("/haldus/kampaaniad");
  return { success: true };
}

export async function toggleCampaignActive(formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const parsed = toggleCampaignActiveSchema.safeParse({
    campaign_id: formData.get("campaign_id"),
    is_active: formData.get("is_active"),
  });
  if (!parsed.success) return;

  const db = createAdminClient();
  const { data, error } = await db
    .schema("content")
    .from("campaigns")
    .update({ is_active: parsed.data.is_active })
    .eq("id", parsed.data.campaign_id)
    .select("name_et")
    .single();

  if (!error) {
    await audit(session.user.id, "campaign.active_toggled", "content.campaign", parsed.data.campaign_id, {
      after: { name: data?.name_et, is_active: parsed.data.is_active },
    });
    revalidateCampaign();
    revalidatePath("/haldus/kampaaniad");
  }
}

export async function deleteCampaign(
  _state: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await requireAdminSession(["admin"]);
  const parsed = z.string().uuid().safeParse(formData.get("id"));
  if (!parsed.success) return { error: "Kampaaniat ei leitud." };
  const id = parsed.data;
  const db = createAdminClient();
  const { data, error } = await db.schema("content").from("campaigns").delete().eq("id", id).select("name_et").single();
  if (error) return { error: "Kampaania kustutamine ebaõnnestus." };
  await audit(session.user.id, "campaign.deleted", "content.campaign", id, { before: { name: data?.name_et } });
  revalidateCampaign();
  revalidatePath("/haldus/kampaaniad");
  return { success: true };
}

export async function saveCategory(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = {
    name_et: v.name_et, slug: v.slug,
    parent_id: v.parent_id || null,
    sort_order: v.sort_order ?? 0,
  };
  const result = v.id
    ? await db.schema("commerce").from("categories").update(record).eq("id", v.id).select("id").single()
    : await db.schema("commerce").from("categories").insert(record).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine ebaõnnestus." };
  await audit(session.user.id, v.id ? "category.updated" : "category.created", "content.category", result.data.id, { after: { name: v.name_et } });
  revalidatePath("/raamatud");
  revalidatePath("/haldus/kategooriad");
  return { success: true, id: result.data.id };
}

export async function deleteCategory(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("commerce").from("categories").delete().eq("id", id).select("name_et").single();
  await audit(session.user.id, "category.deleted", "content.category", id, { before: { name: data?.name_et } });
  revalidatePath("/raamatud");
}

export async function saveSeries(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = seriesSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = { name_et: v.name_et, slug: v.slug, description_et: v.description_et || null, cover_image: v.cover_image || null };
  const result = v.id
    ? await db.schema("content").from("series").update(record).eq("id", v.id).select("id").single()
    : await db.schema("content").from("series").insert(record).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine ebaõnnestus." };
  await audit(session.user.id, v.id ? "series.updated" : "series.created", "content.series", result.data.id, { after: { name: v.name_et } });
  revalidateSeries(v.slug);
  revalidatePath("/haldus/sarjad");
  return { success: true, id: result.data.id };
}

export async function deleteSeries(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("content").from("series").delete().eq("id", id).select("name_et").single();
  await audit(session.user.id, "series.deleted", "content.series", id, { before: { name: data?.name_et } });
  revalidateSeries();
}

export async function savePerson(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = personSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = { name: v.name, slug: v.slug, bio_et: v.bio_et || null, updated_at: new Date().toISOString() };
  const result = v.id
    ? await db.schema("people").from("people").update(record).eq("id", v.id).select("id").single()
    : await db.schema("people").from("people").insert({ ...record, created_at: new Date().toISOString() }).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine ebaõnnestus." };
  await audit(session.user.id, v.id ? "person.updated" : "person.created", "people.person", result.data.id, { after: { name: v.name } });
  revalidatePath("/raamatud");
  revalidatePath("/haldus/autorid");
  return { success: true, id: result.data.id };
}

export async function deletePerson(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("people").from("people").delete().eq("id", id).select("name").single();
  await audit(session.user.id, "person.deleted", "people.person", id, { before: { name: data?.name } });
  revalidatePath("/raamatud");
}
