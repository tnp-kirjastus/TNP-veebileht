import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  newPassword: z.string().min(6).max(128).optional(),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Päringu päritolu ei ole lubatud." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sisselogimine on nõutud." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli sisestatud andmeid." }, { status: 400 });
  const { fullName, phone, newPassword } = parsed.data;

  const db = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fullName !== undefined) updates.full_name = fullName.trim() || null;
  if (phone !== undefined) updates.phone = phone.trim() || null;

  const { error: profileError } = await db.from("profiles").update(updates).eq("id", user.id);
  if (profileError) return NextResponse.json({ error: "Profiili salvestamine ebaõnnestus." }, { status: 500 });

  if (newPassword) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) return NextResponse.json({ error: "Parooli muutmine ebaõnnestus." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
