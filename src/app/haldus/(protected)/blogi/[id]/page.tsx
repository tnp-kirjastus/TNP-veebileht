import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { requireAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession(["editor", "admin"]);
  const { id } = await params;
  const db = createAdminClient();
  const { data: post } = await db.schema("content").from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();
  return <><h1 className="font-heading text-5xl">Muuda postitust</h1><p className="text-muted mt-3">{post.title_et}</p><PostForm post={post} /></>;
}

