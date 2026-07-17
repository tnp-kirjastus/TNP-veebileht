import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co").trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
