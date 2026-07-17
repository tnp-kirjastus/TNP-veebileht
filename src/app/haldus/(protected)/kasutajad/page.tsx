import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createAdminClient } from "@/lib/supabase/admin";
<<<<<<< HEAD
import { requireAdminSession } from "@/lib/admin-auth";
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
import { CreateUserForm } from "./CreateUserForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteUserButton } from "./DeleteUserButton";

export default async function UsersAdminPage() {
<<<<<<< HEAD
  await requireAdminSession(["admin"]);
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
  const db = createAdminClient();

  const { data: profiles } = await db
    .from("profiles")
    .select("id,email,role,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminPageHeader title="Kasutajad" description={`${profiles?.length ?? 0} haldusala kasutajat. Ainult admin saab kasutajaid lisada ja kustutada.`} />

      <CreateUserForm />

      <div className="mt-8 grid gap-2">
        {(profiles ?? []).map((p: { id: string; email: string; role: string; created_at: string }) => (
          <div key={p.id} className="flex items-center justify-between gap-4 border border-line bg-panel p-4 hover:bg-soft/50">
            <div className="flex items-center gap-4">
              <span className="font-bold">{p.email}</span>
              <StatusBadge variant={p.role as "admin" | "editor" | "viewer"} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString("et-EE")}</span>
              <DeleteUserButton userId={p.id} email={p.email} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
