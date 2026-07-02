import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminRole = "viewer" | "editor" | "admin";

const DEV_BYPASS = process.env.NODE_ENV !== "production" && process.env.DEV_ADMIN_BYPASS === "true";

export const getAdminSession = cache(async () => {
  if (DEV_BYPASS) {
    return {
      user: { id: "dev-bypass", email: "dev@tanapaev.ee" },
      role: "admin" as AdminRole,
      email: "dev@tanapaev.ee",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles")
    .select("role,email").eq("id", user.id).maybeSingle();
  if (!profile || !["viewer", "editor", "admin"].includes(profile.role)) return null;
  return { user, role: profile.role as AdminRole, email: profile.email ?? user.email ?? "" };
});

export async function requireAdminSession(roles: AdminRole[] = ["viewer", "editor", "admin"]) {
  const session = await getAdminSession();
  if (!session) redirect("/haldus/sisselogimine");
  if (!roles.includes(session.role)) redirect("/haldus?denied=1");
  return session;
}

