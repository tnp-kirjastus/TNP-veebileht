import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import nodemailer from "nodemailer";

export async function GET() {
  const env = serverEnv();
  const key = env.RESEND_API_KEY;
  const keyPrefix = key ? key.slice(0, 10) : "NOT SET";

  const hasSmtp = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  const results: Record<string, unknown> = {
    transport: hasSmtp ? "SMTP" : (key ? "Resend" : "NONE"),
    smtpConfigured: hasSmtp,
    smtpHost: env.SMTP_HOST || "NOT SET",
    resendKeyPrefix: keyPrefix,
  };

  if (hasSmtp) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT ?? "587", 10),
      secure: env.SMTP_PORT === "465",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

    try {
      await transport.verify();
      results.smtpStatus = "OK";
    } catch (err) {
      results.smtpStatus = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      const info = await transport.sendMail({
        from: "tellimused@tnp.ee",
        to: "tellimused@tnp.ee",
        subject: "[DIAGNOSTIKA] SMTP test " + new Date().toISOString(),
        text: "SMTP diagnostika test. Kui saad kätte, töötab.",
      });
      results.smtpSend = "OK";
      results.etherealUrl = nodemailer.getTestMessageUrl(info) || "N/A";
    } catch (err) {
      results.smtpSend = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
    }
    return NextResponse.json(results);
  }

  if (!key) {
    return NextResponse.json({ ...results, error: "No email transport configured" }, { status: 500 });
  }

  // Resend fallback
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  try {
    const sendResult = await resend.emails.send({
      from: "tellimused@tnp.ee",
      to: "tellimused@tnp.ee",
      subject: "[DIAGNOSTIKA] Resend test " + new Date().toISOString(),
      html: "<p>Diagnostika test e-kiri.</p>",
    });
    results.sendResult = sendResult;
  } catch (err) {
    results.sendError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results);
}
