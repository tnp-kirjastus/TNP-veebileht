"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["viewer", "editor", "admin"]),
});

export async function createUser(_state: { error?: string; success?: string } | undefined, formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const raw = Object.fromEntries(formData.entries());
  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli v\u00e4lju." };

  const { email, password, role } = parsed.data;
  const db = createAdminClient();

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes("already") || authError.message?.includes("duplicate")) {
      return { error: "Selle e-postiga kasutaja on juba olemas." };
    }
    return { error: "Kasutaja loomine eba\u00f5nnestus." };
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    email,
    role,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    return { error: "Profiili loomine eba\u00f5nnestus." };
  }

  await audit(session.user.id, "user.created", "auth.user", created.user.id, {
    after: { email, role },
  });

  revalidatePath("/haldus/kasutajad");
  return { success: `Kasutaja ${email} loodud rolliga "${role}".` };
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const db = createAdminClient();

  const { data: profile } = await db.from("profiles").select("email,role").eq("id", id).maybeSingle();
  if (!profile) return;

  if (id === session.user.id) return;

  await db.from("profiles").delete().eq("id", id);
  await db.auth.admin.deleteUser(id);

  await audit(session.user.id, "user.deleted", "auth.user", id, {
    before: { email: profile.email, role: profile.role },
  });

  revalidatePath("/haldus/kasutajad");
}
