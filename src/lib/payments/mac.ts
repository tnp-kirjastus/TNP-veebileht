import { createHash, timingSafeEqual } from "node:crypto";

export function calculateMaksekeskusMac(json: string, secret: string) {
  return createHash("sha512").update(json + secret).digest("hex").toUpperCase();
}

export function verifyMaksekeskusMac(json: string, secret: string, received: string) {
  const expected = Buffer.from(calculateMaksekeskusMac(json, secret), "utf8");
  const actual = Buffer.from(received.trim().toUpperCase(), "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
