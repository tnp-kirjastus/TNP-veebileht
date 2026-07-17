import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { userId, email, fullName } = await request.json();
    if (!userId || !email) return NextResponse.json({ error: "missing fields" }, { status: 400 });
    const db = createAdminClient();
    await db.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || null,
      role: "customer",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
