"use client";

import { useActionState } from "react";
import { savePost } from "@/app/haldus/actions";

export interface EditablePost {
  id?: string;
  title_et?: string;
  slug?: string;
  excerpt_et?: string | null;
  content_et?: string | null;
  image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_published?: boolean;
  published_at?: string | null;
}

export function PostForm({ post = {} }: { post?: EditablePost }) {
  const [state, action, pending] = useActionState(savePost, undefined);
  return (
    <form action={action} className="grid gap-6 max-w-4xl mt-8">
      {post.id && <input type="hidden" name="id" value={post.id} />}
      <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <label className="grid gap-2 text-sm font-bold">Pealkiri<input name="title_et" required minLength={3} maxLength={200} defaultValue={post.title_et} className="border border-line bg-panel p-3 font-normal" /></label>
        <label className="grid gap-2 text-sm font-bold">URL-i nimi<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={post.slug} className="border border-line bg-panel p-3 font-normal" /></label>
      </div>
      <label className="grid gap-2 text-sm font-bold">Lühikirjeldus<textarea name="excerpt_et" maxLength={800} rows={3} defaultValue={post.excerpt_et ?? ""} className="border border-line bg-panel p-3 font-normal" /></label>
      <label className="grid gap-2 text-sm font-bold">Sisu (turvaline HTML)<textarea name="content_et" required rows={18} defaultValue={post.content_et ?? ""} className="border border-line bg-panel p-3 font-mono text-sm font-normal" /></label>
      <label className="grid gap-2 text-sm font-bold">Pildi URL<input name="image_url" type="url" defaultValue={post.image_url ?? ""} className="border border-line bg-panel p-3 font-normal" /></label>
      <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <label className="grid gap-2 text-sm font-bold">SEO pealkiri<input name="seo_title" maxLength={70} defaultValue={post.seo_title ?? ""} className="border border-line bg-panel p-3 font-normal" /></label>
        <label className="grid gap-2 text-sm font-bold">SEO kirjeldus<textarea name="seo_description" maxLength={170} rows={2} defaultValue={post.seo_description ?? ""} className="border border-line bg-panel p-3 font-normal" /></label>
      </div>
      <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <label className="grid gap-2 text-sm font-bold">Olek<select name="status" defaultValue={post.is_published ? "published" : "draft"} className="border border-line bg-panel p-3 font-normal"><option value="draft">Mustand</option><option value="published">Avaldatud</option></select></label>
        <label className="grid gap-2 text-sm font-bold">Avaldamise aeg<input name="published_at" type="datetime-local" defaultValue={post.published_at?.slice(0, 16) ?? ""} className="border border-line bg-panel p-3 font-normal" /></label>
      </div>
      {state?.error && <p role="alert" className="text-accent font-bold">{state.error}</p>}
      <button disabled={pending} className="justify-self-start min-h-12 px-8 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">{pending ? "Salvestan…" : "Salvesta postitus"}</button>
    </form>
  );
}

