import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { smailySubscribe } from "@/lib/smaily/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Retry = { id: string; operation: string; email_normalized: string };

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const workerId = randomUUID();
  const { data, error } = await supabase.schema("smaily").rpc("claim_retries", { p_worker_id: workerId, p_batch_size: 20 });
  if (error) return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  let completed = 0;
  for (const item of (data ?? []) as Retry[]) {
    const result = item.operation === "opt_in" ? await smailySubscribe(item.email_normalized) : { ok: false, error: "unknown_operation" };
    if (result.ok) {
      await supabase.schema("smaily").rpc("complete_retry", { p_id: item.id, p_lease_id: workerId });
      completed++;
    } else {
      await supabase.schema("smaily").rpc("fail_retry", { p_id: item.id, p_lease_id: workerId, p_error_code: result.error ?? "provider_error" });
    }
  }
  return NextResponse.json({ claimed: data?.length ?? 0, completed });
}
