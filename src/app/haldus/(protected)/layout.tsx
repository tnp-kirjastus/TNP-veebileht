import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  return <AdminShell role={session.role} email={session.email}>{children}</AdminShell>;
}

