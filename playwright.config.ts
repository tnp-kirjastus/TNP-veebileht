import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

// Lae .env.local testprotsessi (Supabase võtmed DB-otseseid kontrolle tegevate testide jaoks)
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !process.env[line.slice(0, i).trim()]) {
    process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1, // DB-d muutev test ei tohi teistega põrkuda
  use: {
    baseURL: "http://localhost:3000",
    locale: "et-EE",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      NODE_OPTIONS: "--use-system-ca",
      DEV_ADMIN_BYPASS: "true", // admin-lehed on testides avatud ilma sisselogimiseta
    },
  },
});
