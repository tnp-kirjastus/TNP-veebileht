"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { sanitizeRichText } from "@/lib/sanitize";
import { audit } from "@/lib/audit";

const postSchema = z.object({
  id: z.string().uuid().optional(),
  title_et: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(3).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt_et: z.string().trim().max(800).optional(),
  content_et: z.string().trim().min(1).max(100_000),
  image_url: z.union([z.url(), z.literal("")]).optional(),
  seo_title: z.string().trim().max(70).optional(),
  seo_description: z.string().trim().max(170).optional(),
  status: z.enum(["draft", "published"]),
  published_at: z.string().optional(),
});

export async function login(_state: { error?: string } | undefined, formData: FormData) {
  const email = z.email().safeParse(formData.get("email"));
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!email.success || !password.success) return { error: "Sisselogimine eba\u00f5nnestus." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) return { error: "Sisselogimine eba\u00f5nnestus." };
  redirect("/haldus");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/haldus/sisselogimine");
}

export async function savePost(_state: { error?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };
  const value = parsed.data;
  const db = createAdminClient();
  const record = {
    title_et: value.title_et,
    slug: value.slug,
    excerpt_et: value.excerpt_et || null,
    content_et: sanitizeRichText(value.content_et),
    image_url: value.image_url || null,
    seo_title: value.seo_title || null,
    seo_description: value.seo_description || null,
    is_published: value.status === "published",
    published_at: value.status === "published" ? (value.published_at || new Date().toISOString()) : null,
    author_id: session.user.id,
    updated_at: new Date().toISOString(),
  };
  const result = value.id
    ? await db.schema("content").from("posts").update(record).eq("id", value.id).select("id").single()
    : await db.schema("content").from("posts").insert(record).select("id").single();
<<<<<<< HEAD
  if (result.error) return { error: result.error.code === "23505" ? "See URL-i nimi on juba kasutusel." : "Salvestamine ebaõnnestus." };
=======
  if (result.error) return { error: result.error.code === "23505" ? "See URL-i nimi on juba kasutusel." : "Salvestamine eba\u00f5nnestus." };
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

  await audit(session.user.id, value.id ? "blog.post.updated" : "blog.post.created", "content.post", result.data.id, {
    after: { title: value.title_et, status: value.status },
  });

  revalidatePath("/uudised");
  revalidatePath(`/uudis/${value.slug}`);
  redirect("/haldus/blogi");
}

export async function deletePost(formData: FormData) {
  const session = await requireAdminSession(["editor", "admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();
  const { data } = await db.schema("content").from("posts").update({ is_published: false, published_at: null }).eq("id", id).select("title_et").single();
  await audit(session.user.id, "blog.post.unpublished", "content.post", id, { after: { title: data?.title_et } });
  revalidatePath("/uudised");
}
