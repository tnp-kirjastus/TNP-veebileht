import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filepath) {
  try {
    const content = readFileSync(filepath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  } catch { /* ignore */ }
}
loadEnv(resolve(__dirname, "..", ".env.local"));

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not set in environment");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "admin@tanapaev.ee";
const DEMO_PASSWORD = "tanapaev2024";
const DEMO_ROLE = "admin";

async function main() {
  // 1. Check if user already exists
  const { data: existing } = await db.auth.admin.listUsers();
  const found = existing?.users?.find(u => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase());

  let userId;

  if (found) {
    console.log(`Kasutaja ${DEMO_EMAIL} on juba olemas (id: ${found.id})`);
    userId = found.id;
  } else {
    // 2. Create user in auth.users
    const { data: created, error } = await db.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { source: "seed" },
    });
    if (error) {
      console.error("Kasutaja loomine eba\u00f5nnestus:", error.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`Kasutaja ${DEMO_EMAIL} loodud (id: ${userId})`);
  }

  // 3. Upsert profile row with admin role
  const { error: profileError } = await db.from("profiles").upsert({
    id: userId,
    email: DEMO_EMAIL,
    role: DEMO_ROLE,
    created_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (profileError) {
    console.error("Profiili loomine eba\u00f5nnestus:", profileError.message);
    process.exit(1);
  }

  console.log(`Profiil seadistatud rolliga "${DEMO_ROLE}".`);
  console.log(`\nSisselogimine: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main();
