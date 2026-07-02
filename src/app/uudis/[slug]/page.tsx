/* Blog media may come from approved CMS hosts with unknown intrinsic dimensions. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { getPublishedPost } from "@/lib/blog";
import { plainText, sanitizeRichText } from "@/lib/sanitize";
import { siteUrl } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return { title: "Uudist ei leitud", robots: { index: false } };
  return { title: post.seo_title || post.title_et, description: post.seo_description || post.excerpt_et || plainText(post.content_et).slice(0, 160), alternates: { canonical: `/uudis/${post.slug}` }, openGraph: { type: "article", title: post.title_et, publishedTime: post.published_at || undefined, images: post.image_url ? [post.image_url] : [] } };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title_et, datePublished: post.published_at, image: post.image_url || undefined, mainEntityOfPage: new URL(`/uudis/${post.slug}`, siteUrl()).toString(), publisher: { "@type": "Organization", name: "Kirjastus Tänapäev" } };
  return <LayoutContained><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Uudised", href: "/uudised" }, { label: post.title_et }]} /><article className="py-12 max-w-[860px] mx-auto"><time dateTime={post.published_at ?? undefined} className="text-sm text-muted">{post.published_at ? new Date(post.published_at).toLocaleDateString("et-EE", { day: "numeric", month: "long", year: "numeric" }) : ""}</time><h1 className="font-heading text-[clamp(32px,5vw,48px)] leading-[1.15] mt-3 mb-6">{post.title_et}</h1>{post.image_url && <img src={post.image_url} alt="" className="w-full mb-8" />}<div className="prose prose-lg max-w-none prose-headings:font-heading prose-a:text-accent" dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content_et) }} /></article><div className="py-8 text-center border-t border-line"><Link href="/uudised" className="text-accent font-bold hover:underline">← Kõik uudised</Link></div></LayoutContained>;
}
