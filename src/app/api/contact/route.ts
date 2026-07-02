import { NextResponse } from "next/server";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact";
import { consumeRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(320),
  message: z.string().trim().min(5).max(5000),
  locale: z.enum(["et", "en"]).default("et"),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && new URL(origin).origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Päringu päritolu ei ole lubatud." }, { status: 403 });
  const clientKey = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("cf-connecting-ip")?.trim() ?? "unknown";
  if (!await consumeRateLimit("contact", clientKey, 60, 3)) {
    return NextResponse.json({ error: "Liiga palju päringuid. Proovi hetke pärast uuesti." }, { status: 429 });
  }
  const formData = await request.formData();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return NextResponse.json({ error: "Kontrolli sisestatud andmeid." }, { status: 400 });
  const result = await submitContactMessage(parsed.data);
  if (!result.ok) return NextResponse.json({ error: "Salvestamine ebaõnnestus." }, { status: 500 });
  return NextResponse.json({ success: true });
}

