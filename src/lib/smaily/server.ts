import "server-only";

import { z } from "zod";
import { serverEnv } from "@/lib/env";

const responseSchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
}).passthrough();

export async function smailySubscribe(email: string): Promise<{ ok: boolean; error?: string }> {
  const env = serverEnv();
  if (!env.SMAILY_SUBDOMAIN || !env.SMAILY_API_USER || !env.SMAILY_API_PASSWORD) {
    return { ok: false, error: "not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://${env.SMAILY_SUBDOMAIN}.sendsmaily.net/api/autoresponder.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${env.SMAILY_API_USER}:${env.SMAILY_API_PASSWORD}`).toString("base64")}`,
      },
      body: JSON.stringify({ addresses: [{ email }] }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = responseSchema.safeParse(await response.json().catch(() => ({})));
    if (!response.ok) return { ok: false, error: body.success ? body.data.message ?? `http_${response.status}` : `http_${response.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.name : "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
