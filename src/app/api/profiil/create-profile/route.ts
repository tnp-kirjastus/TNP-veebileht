import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  fullName: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Päringu päritolu ei ole lubatud." }, { status: 403 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sisselogimine on nõutud." }, { status: 401 });

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Kontrolli sisestatud andmeid." }, { status: 400 });
    const { fullName } = parsed.data;

    if (!user.email) return NextResponse.json({ error: "Kasutaja e-posti aadress puudub." }, { status: 400 });

    const db = createAdminClient();
    const { error } = await db.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) {
      console.error("profile_create_failed", { userId: user.id, message: error.message });
      return NextResponse.json({ error: "Profiili loomine ebaõnnestus." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("profile_create_exception", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Profiili loomine ebaõnnestus." }, { status: 500 });
  }
}
