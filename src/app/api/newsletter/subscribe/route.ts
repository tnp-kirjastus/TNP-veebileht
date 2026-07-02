import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { smailySubscribe } from "@/lib/smaily/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.email().trim().max(320).transform((value) => value.toLowerCase()),
  source: z.enum(["footer", "homepage", "news", "publisher"]).default("footer"),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && new URL(origin).origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Päringu päritolu ei ole lubatud." }, { status: 403 });
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("cf-connecting-ip")?.trim() ?? "unknown";
  if (!await consumeRateLimit("newsletter", clientKey, 300, 5)) {
    return NextResponse.json({ error: "Liiga palju päringuid. Proovi hiljem uuesti." }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const input = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Palun sisesta korrektne e-posti aadress." }, { status: 400 });

  const supabase = createAdminClient();
  const evidence = {
    user_agent_hash: createHash("sha256").update(request.headers.get("user-agent") ?? "unknown").digest("hex"),
    locale: request.headers.get("accept-language")?.slice(0, 80) ?? null,
  };
  const { error: logError } = await supabase.schema("smaily").from("consent_log").insert({
    email_normalized: parsed.data.email,
    event: "opt_in_requested",
    source: parsed.data.source,
    consent_text_id: "newsletter-double-opt-in-v1",
    request_evidence: evidence,
  });
  if (logError) return NextResponse.json({ error: "Liitumist ei õnnestunud salvestada." }, { status: 503 });

  const result = await smailySubscribe(parsed.data.email);
  if (!result.ok) {
    await supabase.schema("smaily").from("retry_queue").insert({
      operation: "opt_in",
      email_normalized: parsed.data.email,
      payload: { source: parsed.data.source },
      last_error_code: result.error?.slice(0, 120) ?? "provider_error",
    });
  }

  return NextResponse.json({ success: true, message: "Kontrolli oma postkasti ja kinnita liitumine." });
}
