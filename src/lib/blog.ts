import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface BlogPost {
  id: string;
  slug: string;
  title_et: string;
  excerpt_et: string | null;
  content_et: string | null;
  image_url: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

const POST_COLUMNS =
  "id,slug,title_et,excerpt_et,content_et,image_url,published_at,seo_title,seo_description";

export const getPublishedPosts = cache(async (limit = 50): Promise<BlogPost[]> => {
  const db = await createClient();
  const { data, error } = await db.schema("content").from("posts")
    .select(POST_COLUMNS)
    .eq("is_published", true).lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`getPublishedPosts: ${error.message}`);
  return data ?? [];
});

export const getPublishedPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const db = await createClient();
  const { data } = await db.schema("content").from("posts")
    .select(POST_COLUMNS)
    .eq("slug", slug).eq("is_published", true).lte("published_at", new Date().toISOString()).maybeSingle();
  return data ?? null;
});
