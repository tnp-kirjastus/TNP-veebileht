import { getPublishedPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/env";

function escapeXml(value: string) { return value.replace(/[<>&'\"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char]!); }

export async function GET() {
  const posts = await getPublishedPosts(20);
  const base = siteUrl();
  const items = posts.map((post) => `<item><title>${escapeXml(post.title_et)}</title><link>${new URL(`/uudis/${post.slug}`, base)}</link><guid>${post.id}</guid>${post.published_at ? `<pubDate>${new Date(post.published_at).toUTCString()}</pubDate>` : ""}<description>${escapeXml(post.excerpt_et || "")}</description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Kirjastus Tänapäev uudised</title><link>${new URL("/uudised", base)}</link><description>Kirjastuse uudised ja teated</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}

