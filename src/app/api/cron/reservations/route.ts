import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().schema("commerce").rpc("release_expired_reservations", { p_batch_size: 250 });
  if (error) return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  return NextResponse.json({ released: data });
}
