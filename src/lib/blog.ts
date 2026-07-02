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

const fallbackPosts: BlogPost[] = [
  {
    id: "mockup-kasikirjade-tulemused-2026", slug: "kasikirjade-voistluse-tulemused-2026",
    title_et: "Käsikirjade võistluse tulemused 2026",
    excerpt_et: "Selgunud on selle aasta romaanivõistluse võitjad. Esikoha pälvis „Tuulte vari“ — kaasahaarav ajalooline romaan, mis jõuab lugejateni sügisel.",
    content_et: "<p>Selgunud on selle aasta romaanivõistluse võitjad. Esikoha pälvis „Tuulte vari“ — kaasahaarav ajalooline romaan, mis jõuab lugejateni sügisel. Teise ja kolmanda koha töödega saab tutvuda siin.</p>",
    image_url: null, published_at: "2026-06-10T09:00:00Z", seo_title: null, seo_description: null,
  },
  {
    id: "mockup-lood-labi-aja", slug: "uus-kasikirjade-voistlus-lood-labi-aja",
    title_et: "Uus käsikirjade võistlus: „Lood läbi aja“",
    excerpt_et: "Ootame lühiromaane, mis räägivad lugusid läbi erinevate ajastute. Tähtaeg on 30. november 2026.",
    content_et: "<p>Kirjastus Tänapäev kuulutab välja uue käsikirjade võistluse, kuhu ootame lühiromaane, mis räägivad lugusid läbi erinevate ajastute. Tähtaeg on 30. november 2026.</p>",
    image_url: null, published_at: "2026-05-01T09:00:00Z", seo_title: null, seo_description: null,
  },
  {
    id: "mockup-kataloog-2026", slug: "tanapaev-26-uus-kataloog-on-ilmunud",
    title_et: "Tänapäev 26 — uus kataloog on ilmunud",
    excerpt_et: "Värske kevadkataloog toob lugejateni 42 uut raamatut. Tutvu ettetellimuste ja kevadiste pakkumistega meie veebipoes.",
    content_et: "<p>Värske kevadkataloog toob lugejateni 42 uut raamatut. Tule tutvu ettetellimuste ja kevadiste pakkumistega meie veebipoes.</p>",
    image_url: null, published_at: "2026-03-14T09:00:00Z", seo_title: null, seo_description: null,
  },
  {
    id: "mockup-vaike-lugu", slug: "lastekirjanduse-voistlus-vaike-lugu",
    title_et: "Lastekirjanduse võistlus „Väike lugu“",
    excerpt_et: "Koostöös Eesti Lastekirjanduse Keskusega kuulutame välja lastejutuvõistluse 6–10-aastastele lugejatele.",
    content_et: "<p>Koostöös Eesti Lastekirjanduse Keskusega kuulutame välja lastejutuvõistluse. Ootame töid, mis kõnetaksid 6–10-aastaseid lugejaid. Tähtaeg on 15. august 2026.</p>",
    image_url: null, published_at: "2026-01-05T09:00:00Z", seo_title: null, seo_description: null,
  },
];

export const getPublishedPosts = cache(async (limit = 50): Promise<BlogPost[]> => {
  const db = await createClient();
  const { data, error } = await db.schema("content").from("posts")
    .select("id,slug,title_et,excerpt_et,content_et,image_url,published_at,seo_title,seo_description")
    .eq("is_published", true).lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false }).limit(limit);
  if (error || !data?.length) return fallbackPosts.slice(0, limit);
  return data;
});

export const getPublishedPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const db = await createClient();
  const { data } = await db.schema("content").from("posts")
    .select("id,slug,title_et,excerpt_et,content_et,image_url,published_at,seo_title,seo_description")
    .eq("slug", slug).eq("is_published", true).lte("published_at", new Date().toISOString()).maybeSingle();
  return data ?? fallbackPosts.find((post) => post.slug === slug) ?? null;
});
