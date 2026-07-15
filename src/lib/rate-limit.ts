import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";

export async function consumeRateLimit(
  endpoint: string,
  identifyingValue: string,
  windowSeconds: number,
  maxRequests: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const env = serverEnv();
  const hmacKey = env.CRON_SECRET ?? env.CART_SESSION_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY;
  const keyHash = createHmac("sha256", hmacKey).update(identifyingValue).digest("hex");
  const { data, error } = await supabase.schema("system").rpc("consume_rate_limit", {
    p_key_hash: keyHash,
    p_endpoint: endpoint,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });
  if (error) {
    console.error("rate_limit_rpc_error", { endpoint, error: error.message });
    if (serverEnv().NODE_ENV === "production") return false;
    return true;
  }
  return data as boolean;
}
