import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

function secretKey() {
  const env = serverEnv();
  const secret = env.CART_SESSION_SECRET
    ?? (env.NODE_ENV === "production" ? "" : "tnp-development-cart-secret-change-me");
  return new TextEncoder().encode(secret);
}

export async function createCartSession(): Promise<{ token: string; sessionId: string }> {
  const sessionId = crypto.randomUUID();
  const token = await new SignJWT({ sub: sessionId, purpose: "cart" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
  return { token, sessionId };
}

export async function verifyCartSession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "cart" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
