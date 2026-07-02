import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePost } from "@/app/haldus/actions";

export default async function BlogAdminPage() {
  const db = createAdminClient();
  const { data: posts } = await db.schema("content").from("posts")
    .select("id,slug,title_et,is_published,published_at,updated_at")
    .order("updated_at", { ascending: false }).limit(100);
  return <><div className="flex items-end justify-between gap-4"><div><h1 className="font-heading text-5xl">Blogi / Uudised</h1><p className="text-muted mt-3">Halda mustandeid, avaldamist ja uudiste SEO-d.</p></div><Link href="/haldus/blogi/uus" className="min-h-11 px-5 bg-ink text-white font-bold inline-flex items-center">Uus postitus</Link></div><div className="overflow-x-auto mt-8 border border-line bg-panel"><table className="w-full text-left"><thead className="bg-soft text-sm"><tr><th className="p-4">Pealkiri</th><th className="p-4">Olek</th><th className="p-4">Avaldatud</th><th className="p-4">Tegevused</th></tr></thead><tbody>{(posts ?? []).map((post) => <tr key={post.id} className="border-t border-line"><td className="p-4"><Link href={`/haldus/blogi/${post.id}`} className="font-bold hover:text-accent">{post.title_et}</Link><p className="text-xs text-muted mt-1">/uudis/{post.slug}</p></td><td className="p-4"><span className={`px-2 py-1 text-xs font-bold ${post.is_published ? "bg-leaf text-white" : "bg-soft"}`}>{post.is_published ? "Avaldatud" : "Mustand"}</span></td><td className="p-4 text-sm text-muted">{post.published_at ? new Date(post.published_at).toLocaleString("et-EE") : "—"}</td><td className="p-4"><div className="flex gap-3"><Link href={`/haldus/blogi/${post.id}`} className="text-accent font-bold text-sm">Muuda</Link>{post.is_published && <form action={deletePost}><input type="hidden" name="id" value={post.id} /><button className="text-sm font-bold">Võta maha</button></form>}</div></td></tr>)}{!posts?.length && <tr><td colSpan={4} className="p-8 text-center text-muted">Postitusi veel ei ole.</td></tr>}</tbody></table></div></>;
}

