import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(request.url).pathname.split("/").pop();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data } = await supabase.schema("commerce").from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "order not found" }, { status: 404 });

  return NextResponse.json({ order: data });
}
