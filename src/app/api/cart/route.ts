import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartSession, mutateCart, readCart } from "@/lib/cart-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const mutationSchema = z.object({
  slug: z.string().trim().min(1).max(240),
  quantity: z.number().int().min(0).max(99),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return new URL(origin).origin === new URL(request.url).origin;
}

export async function GET() {
  const sessionId = await getCartSession(true);
  if (!await consumeRateLimit("cart", sessionId!, 60, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  return NextResponse.json(await readCart(sessionId!));
}

async function change(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const sessionId = await getCartSession(true);
  if (!await consumeRateLimit("cart_write", sessionId!, 60, 60)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_cart_item" }, { status: 400 });
  try {
    const cart = await mutateCart(sessionId!, parsed.data.slug, parsed.data.quantity || null);
    return NextResponse.json(cart);
  } catch (error) {
    const code = error instanceof Error ? error.message : "cart_write_failed";
    return NextResponse.json({ error: code }, { status: code === "product_not_found" ? 404 : 400 });
  }
}

export const POST = change;
export const PATCH = change;
export const DELETE = change;
