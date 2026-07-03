import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deletePost } from "@/app/haldus/actions";

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const statusFilter = params.status ?? "";

  const db = createAdminClient();
  let builder = db.schema("content").from("posts")
    .select("id,slug,title_et,is_published,published_at,excerpt_et,updated_at")
    .order("updated_at", { ascending: false }).limit(100);

  if (query) builder = builder.ilike("title_et", `%${query}%`);
  if (statusFilter === "published") builder = builder.eq("is_published", true);
  else if (statusFilter === "draft") builder = builder.eq("is_published", false);

  const { data: posts } = await builder;

  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-4xl">Blogi / Uudised</h1>
          <p className="text-muted mt-2">Halda mustandeid, avaldamist ja uudiste SEO-d.</p>
        </div>
        <Link href="/haldus/blogi/uus" className="min-h-12 px-6 bg-[#151718] !text-white font-bold inline-flex items-center hover:bg-[#151718]/80 transition-colors">+ Lisa uus postitus</Link>
      </div>

      <form className="mb-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
        <input type="search" name="q" defaultValue={query} placeholder="Otsi pealkirja järgi…"
          className="flex-1 min-w-0 h-11 border border-line bg-paper px-4 outline-none text-sm" />
        <select name="status" defaultValue={statusFilter} className="h-11 border border-line bg-paper px-3 text-sm font-bold">
          <option value="">Kõik</option>
          <option value="published">Avaldatud</option>
          <option value="draft">Mustandid</option>
        </select>
        <button type="submit" className="h-11 px-5 border border-line bg-soft text-sm font-bold hover:bg-line/30">Filtreeri</button>
        {(query || statusFilter) && <Link href="/haldus/blogi" className="h-11 px-4 inline-flex items-center text-sm text-muted hover:text-ink font-bold">Tühista</Link>}
      </form>

      <div className="border border-line bg-panel">
        <table className="w-full text-left">
          <thead className="bg-soft text-sm">
            <tr>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Pealkiri</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Olek</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Avaldatud</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {(posts ?? []).map((post) => (
              <tr key={post.id} className="border-t border-line hover:bg-soft/50">
                <td className="p-4">
                  <Link href={`/haldus/blogi/${post.id}`} className="font-bold hover:text-accent">{post.title_et}</Link>
                  <p className="text-xs text-muted mt-1">/uudis/{post.slug}</p>
                </td>
                <td className="p-4">
                  {post.is_published ? <StatusBadge variant="published" /> : <StatusBadge variant="draft" />}
                </td>
                <td className="p-4 text-sm text-muted">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString("et-EE", { day: "numeric", month: "long", year: "numeric" }) : "\u2014"}
                </td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <Link href={`/haldus/blogi/${post.id}`} className="text-accent font-bold text-sm hover:underline">Muuda</Link>
                    <Link href={`/uudis/${post.slug}`} target="_blank" className="text-muted text-sm hover:text-ink">Eelvaade →</Link>
                    {post.is_published && (
                      <form action={deletePost} className="inline">
                        <input type="hidden" name="id" value={post.id} />
                        <button className="text-sm text-muted font-bold hover:text-accent">Võta maha</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(!posts || posts.length === 0) && (
              <tr><td colSpan={4} className="p-12 text-center text-muted">Postitusi ei leitud.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
