import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl().origin;
  const staticPaths = ["", "/raamatud", "/arhiiv", "/uudised", "/sarjad", "/pakkumised", "/et/kirjastus", "/et/kontakt", "/kasutustingimused", "/privaatsuspoliitika"];
  const posts = await getPublishedPosts(500);
  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly" as const })),
    ...getActiveProducts().map((product) => ({ url: `${origin}/raamat/${product.slug}`, changeFrequency: "weekly" as const, lastModified: product.release_date ? new Date(product.release_date) : undefined })),
    ...posts.map((post) => ({ url: `${origin}/uudis/${post.slug}`, changeFrequency: "monthly" as const, lastModified: post.published_at ? new Date(post.published_at) : undefined })),
  ];
}
