import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(request.url).pathname.split("/").pop();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data, error } = await supabase.schema("commerce").from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("customer_order_detail_failed", { userId: user.id, orderId: id, message: error.message });
    return NextResponse.json({ error: "Tellimuse laadimine ebaõnnestus." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Tellimust ei leitud." }, { status: 404 });

  const { order_items, order_status_history, ...order } = data;
  return NextResponse.json({
    order: {
      ...order,
      items: order_items ?? [],
      status_history: order_status_history ?? [],
    },
  });
}
