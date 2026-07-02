/* Blog media may come from approved CMS hosts with unknown intrinsic dimensions. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { LayoutFull, Shell } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { NewsletterSection } from "@/components/store/NewsletterSection";
import { getPublishedPosts } from "@/lib/blog";

export const metadata: Metadata = { title: "Uudised", description: "Käsikirjade võistlused, uudised ja tulemused kirjastuselt Tänapäev." };

export default async function NewsPage() {
  const posts = await getPublishedPosts();
  return <LayoutFull>
    <section className="py-[50px] border-b border-line"><Shell>
      <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Uudised" }]} />
      <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Uudised</h1>
      <p className="max-w-[620px] mt-4 text-muted">Käsikirjade võistlused, uudised ja tulemused kirjastuselt Tänapäev. Jälgi siin värskeimaid teateid.</p>
    </Shell></section>
    <Shell><div className="grid gap-[34px] py-12 max-w-[860px]">
      {posts.map((post) => <article key={post.id} className="border-b border-line pb-[34px] last:border-0">
        <time dateTime={post.published_at ?? undefined} className="text-[13px] font-extrabold text-accent uppercase tracking-[0.04em]">{post.published_at ? new Date(post.published_at).toLocaleDateString("et-EE", { day: "numeric", month: "long", year: "numeric" }) : ""}</time>
        <Link href={`/uudis/${post.slug}`} className="group"><h2 className="font-heading text-[clamp(24px,3vw,36px)] leading-[1.15] mt-2 group-hover:text-accent">{post.title_et}</h2></Link>
        {post.excerpt_et && <p className="mt-3 text-muted max-w-[640px] leading-[1.6]">{post.excerpt_et}</p>}
        {post.image_url && <img src={post.image_url} alt="" className="mt-5 w-full max-h-[400px] object-cover" />}
        <Link href={`/uudis/${post.slug}`} className="inline-block mt-4 font-extrabold text-ink border-b-2 border-accent pb-[2px] hover:text-accent">Loe edasi →</Link>
      </article>)}
    </div></Shell>
    <NewsletterSection />
  </LayoutFull>;
}
