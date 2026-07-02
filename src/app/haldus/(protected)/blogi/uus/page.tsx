import { PostForm } from "@/components/admin/PostForm";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function NewPostPage() {
  await requireAdminSession(["editor", "admin"]);
  return <><h1 className="font-heading text-5xl">Uus blogipostitus</h1><p className="text-muted mt-3">Koosta mustand või avalda uudis.</p><PostForm /></>;
}

