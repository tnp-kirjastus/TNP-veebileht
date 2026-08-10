import { createClient } from "@supabase/supabase-js";

/** Testide DB-klient (service role) — muudatused tuleb alati tagasi võtta. */
export function testDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env puudub (.env.local)");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
