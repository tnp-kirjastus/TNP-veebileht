import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { Resend } from "resend";

export async function GET() {
  const env = serverEnv();
  const key = env.RESEND_API_KEY;
  const keyPrefix = key ? key.slice(0, 10) : "NOT SET";
  const isTest = key?.startsWith("re_test_");

  const results: Record<string, unknown> = {
    keyPrefix,
    isTestMode: isTest,
    fromAddress: isTest ? "noreply@resend.dev" : "tellimused@tnp.ee (LIVE)",
  };

  if (!key) {
    return NextResponse.json({ ...results, error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const resend = new Resend(key);

  try {
    const sendResult = await resend.emails.send({
      from: isTest ? "noreply@resend.dev" : "tellimused@tnp.ee",
      to: "tellimused@tnp.ee",
      subject: "[DIAGNOSTIKA] E-posti test " + new Date().toISOString(),
      html: "<p>Diagnostika test e-kiri. Kui saad selle kätte, töötab Resend ühendus.</p>",
    });

    results.sendResult = sendResult;
    return NextResponse.json(results);
  } catch (err) {
    results.sendError = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && "statusCode" in err) {
      results.statusCode = (err as { statusCode?: number }).statusCode;
    }
    return NextResponse.json(results, { status: 500 });
  }
}
