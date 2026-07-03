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
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description_et: z.string().trim().max(5000).optional(),
  banner_url: z.string().trim().max(500).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
});

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
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = {
    name_et: v.name_et, slug: v.slug, description_et: v.description_et || null,
    banner_url: v.banner_url || null,
    starts_at: v.starts_at || null, ends_at: v.ends_at || null,
    is_active: v.is_active ?? true,
  };
  const result = v.id
    ? await db.schema("content").from("campaigns").update(record).eq("id", v.id).select("id").single()
    : await db.schema("content").from("campaigns").insert(record).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine eba\u00f5nnestus." };
  await audit(session.user.id, v.id ? "campaign.updated" : "campaign.created", "content.campaign", result.data.id, { after: { name: v.name_et } });
  revalidateCampaign();
  return { success: true, id: result.data.id };
}

export async function deleteCampaign(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("content").from("campaigns").delete().eq("id", id).select("name_et").single();
  await audit(session.user.id, "campaign.deleted", "content.campaign", id, { before: { name: data?.name_et } });
  revalidateCampaign();
}

export async function saveCategory(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };
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
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine eba\u00f5nnestus." };
  await audit(session.user.id, v.id ? "category.updated" : "category.created", "content.category", result.data.id, { after: { name: v.name_et } });
  revalidatePath("/raamatud");
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = { name_et: v.name_et, slug: v.slug, description_et: v.description_et || null, cover_image: v.cover_image || null };
  const result = v.id
    ? await db.schema("content").from("series").update(record).eq("id", v.id).select("id").single()
    : await db.schema("content").from("series").insert(record).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine eba\u00f5nnestus." };
  await audit(session.user.id, v.id ? "series.updated" : "series.created", "content.series", result.data.id, { after: { name: v.name_et } });
  revalidateSeries(v.slug);
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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };
  const v = parsed.data;
  const db = createAdminClient();
  const record = { name: v.name, slug: v.slug, bio_et: v.bio_et || null, updated_at: new Date().toISOString() };
  const result = v.id
    ? await db.schema("people").from("people").update(record).eq("id", v.id).select("id").single()
    : await db.schema("people").from("people").insert({ ...record, created_at: new Date().toISOString() }).select("id").single();
  if (result.error) return { error: result.error.code === "23505" ? "Selline URL-i nimi on juba kasutusel." : "Salvestamine eba\u00f5nnestus." };
  await audit(session.user.id, v.id ? "person.updated" : "person.created", "people.person", result.data.id, { after: { name: v.name } });
  revalidatePath("/raamatud");
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
