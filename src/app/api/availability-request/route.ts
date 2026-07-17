import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.email().trim().max(320),
  productTitle: z.string().trim().min(1).max(500),
});

const TARGET_EMAIL = "kristi@tnp.ee";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && new URL(origin).origin === new URL(request.url).origin;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Päringu päritolu ei ole lubatud." }, { status: 403 });
  }

  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("cf-connecting-ip")?.trim() ?? "unknown";
  if (!await consumeRateLimit("availability", clientKey, 10, 60)) {
    return NextResponse.json({ error: "Liiga palju päringuid. Proovi hetke pärast uuesti." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Palun sisesta korrektne e-posti aadress." }, { status: 400 });
  }

  const { email, productTitle } = parsed.data;

  const db = createAdminClient();

  await db.schema("commerce").from("outbox").insert({
    event_type: "availability_request",
    payload: {
      email,
      product_title: productTitle,
      requested_at: new Date().toISOString(),
    },
  });

  try {
    const env = serverEnv();
    if (env.RESEND_API_KEY) {
      const resend = new Resend(env.RESEND_API_KEY);
      const safeProductTitle = escapeHtml(productTitle);
      const safeEmail = escapeHtml(email);
      await resend.emails.send({
        from: "TNP Pood <pood@tnp.ee>",
        to: TARGET_EMAIL,
        subject: `Saadavuse päring: ${productTitle}`,
        html: `
          <p>Klient soovib teada raamatu saadavust:</p>
          <p><strong>Raamat:</strong> ${safeProductTitle}</p>
          <p><strong>Kliendi e-post:</strong> ${safeEmail}</p>
          <p><strong>Kuupäev:</strong> ${new Date().toLocaleDateString("et-EE")}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("availability_request_failed", err);
    return NextResponse.json({ error: "Päringu saatmine ebaõnnestus." }, { status: 500 });
  }
}
