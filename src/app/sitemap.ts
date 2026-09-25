import type { MetadataRoute } from "next";
import { getAllProducts, getSeries } from "@/lib/db/catalog";
import { getPublishedPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/env";

// Sitemap genereeritakse alati värske andmebaasiseisu põhjal.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl().origin;
  const staticPaths = ["", "/raamatud", "/arhiiv", "/uudised", "/sarjad", "/autorid", "/pakkumised", "/kirjastus", "/kontakt", "/en/contact", "/kasutustingimused", "/privaatsuspoliitika"];
  const [posts, allSeries, products] = await Promise.all([
    getPublishedPosts(500),
    getSeries(),
    // Kogu tagaloend (sh arhiiv) — läbimüüdud teoste lehed on avalikud
    // bibliograafilise teabena ja peavad olema otsimootorites leitavad.
    getAllProducts(),
  ]);
  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly" as const })),
    ...allSeries.map((s) => ({ url: `${origin}/sarjad/${s.slug}`, changeFrequency: "weekly" as const })),
    // Arhiivis (läbimüüdud) teosed jäävad indekseeritavaks, kuid madalama
    // prioriteediga — need ei pea otsingutulemustes kõrgel kohal olema.
    ...products.map((product) => ({ url: `${origin}/raamat/${product.slug}`, changeFrequency: "weekly" as const, priority: product.is_archived ? 0.3 : 0.8, lastModified: product.release_date ? new Date(product.release_date) : undefined })),
    ...posts.map((post) => ({ url: `${origin}/uudis/${post.slug}`, changeFrequency: "monthly" as const, lastModified: post.published_at ? new Date(post.published_at) : undefined })),
  ];
}
