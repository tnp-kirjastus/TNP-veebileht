import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co")
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");

  return createClient(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
