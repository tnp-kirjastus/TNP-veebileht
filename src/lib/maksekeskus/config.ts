import "server-only";

import { serverEnv } from "@/lib/env";

const API_BASES = {
  live: "https://api.maksekeskus.ee",
  test: "https://api.test.maksekeskus.ee",
} as const;

export function maksekeskusConfig() {
  const env = serverEnv();
  if (!env.MAKSEKESKUS_SHOP_ID || !env.MAKSEKESKUS_SECRET) {
    throw new Error("maksekeskus_not_configured");
  }

  const mode = env.MAKSEKESKUS_ENV ?? "live";
  return {
    mode,
    shopId: env.MAKSEKESKUS_SHOP_ID,
    secret: env.MAKSEKESKUS_SECRET,
    publishableKey: env.MAKSEKESKUS_PUBLISHABLE_KEY,
    base: (env.MAKSEKESKUS_API_BASE ?? API_BASES[mode]).replace(/\/$/, ""),
  };
}
