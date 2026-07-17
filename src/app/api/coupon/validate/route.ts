import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!await consumeRateLimit("coupon_validate", clientKey, 60, 20)) {
    return NextResponse.json({ valid: false, error: "Liiga palju paringuid. Proovi hetke parast uuesti." }, { status: 429 });
  }

  let code: string;
  let subtotal: number;
  try {
    const body = await request.json();
    code = String(body.code ?? "").trim();
    subtotal = Number(body.subtotal ?? 0);
  } catch {
    return NextResponse.json({ valid: false, error: "Vigane päring." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ valid: false, error: "Sisesta sooduskood." }, { status: 400 });
  }

  const coupon = validateCoupon(code, subtotal);
  if (coupon) {
    return NextResponse.json({ valid: true, discount: coupon.discount, label: coupon.label });
  }

  return NextResponse.json(
    { valid: false, error: "Sooduskood ei kehti või on aegunud." },
    { status: 400 }
  );
}
