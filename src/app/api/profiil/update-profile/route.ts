import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fullName, phone, newPassword } = await request.json();

  const db = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fullName !== undefined) updates.full_name = fullName.trim() || null;
  if (phone !== undefined) updates.phone = phone.trim() || null;

  await db.from("profiles").upsert({ id: user.id, ...updates } as Record<string, unknown>, { onConflict: "id", ignoreDuplicates: false });

  if (newPassword && newPassword.length >= 6) {
    await supabase.auth.updateUser({ password: newPassword });
  }

  return NextResponse.json({ success: true });
}
