import "server-only";

import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CART_SESSION_SECRET: optionalSecret,
  CRON_SECRET: optionalSecret,
  REVALIDATE_SECRET: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  MAKSEKESKUS_SHOP_ID: optionalSecret,
  MAKSEKESKUS_SECRET: optionalSecret,
  MAKSEKESKUS_PUBLISHABLE_KEY: optionalSecret,
  SMAILY_SUBDOMAIN: optionalSecret,
  SMAILY_API_USER: optionalSecret,
  SMAILY_API_PASSWORD: optionalSecret,
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Server configuration is invalid: ${names}`);
  }

  if (parsed.data.NODE_ENV === "production") {
    const secret = parsed.data.CART_SESSION_SECRET;
    if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
      throw new Error("CART_SESSION_SECRET must contain at least 32 bytes in production");
    }
  }

  cached = parsed.data;
  return cached;
}

export function siteUrl(): URL {
  return new URL(serverEnv().NEXT_PUBLIC_SITE_URL);
}
