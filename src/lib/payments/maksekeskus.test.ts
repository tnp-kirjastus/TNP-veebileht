import { describe, expect, it, vi } from "vitest";
import { euroDecimalToCents } from "../money";
import { calculateMaksekeskusMac } from "../payments/mac";

vi.mock("@/lib/env", () => ({
  serverEnv: () => ({
    NODE_ENV: "test" as const,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    MAKSEKESKUS_SHOP_ID: "test-shop-id",
    MAKSEKESKUS_SECRET: "test-secret-32-bytes-minimum-xx",
  }),
  siteUrl: () => new URL("http://localhost:3000"),
}));

import { verifyPaymentMessage, verifyPaymentReturn } from "../payments/maksekeskus";

function makeMessage(overrides: Record<string, unknown> = {}) {
  const payload = {
    amount: "27.60",
    currency: "EUR",
    customer_name: "Test User",
    merchant_data: "WEB-TEST-001",
    message_time: "2025-01-01T12:00:00+02:00",
    message_type: "payment_return",
    reference: "TNP-2025-000001",
    shop: "test-shop-id",
    status: "COMPLETED",
    transaction: "550e8400-e29b-41d4-a716-446655440000",
    ...overrides,
  };
  const json = JSON.stringify(payload);
  const mac = calculateMaksekeskusMac(json, "test-secret-32-bytes-minimum-xx");
  return { json, mac, payload };
}

describe("euroDecimalToCents", () => {
  it.each([["0", 0], ["1.2", 120], ["27.60", 2760], [32, 3200]])("converts %s without floating point arithmetic", (input, expected) => {
    expect(euroDecimalToCents(input)).toBe(expected);
  });

  it.each(["-1", "1.234", "NaN", "12,50", Number.POSITIVE_INFINITY])("rejects invalid money %s", (input) => {
    expect(() => euroDecimalToCents(input)).toThrow("invalid_order_total");
  });
});

describe("verifyPaymentMessage", () => {
  it("verifies a valid COMPLETED payment message", () => {
    const { json, mac, payload } = makeMessage();
    const result = verifyPaymentMessage(json, mac);
    expect(result.status).toBe("COMPLETED");
    expect(result.providerTransactionId).toBe(payload.transaction);
    expect(result.amount).toBe("27.60");
    expect(result.currency).toBe("EUR");
    expect(result.orderReference).toBe(payload.reference);
    expect(result.merchantIdentity).toBe("test-shop-id");
  });

  it("verifies CANCELLED status", () => {
    const { json, mac } = makeMessage({ status: "CANCELLED" });
    const result = verifyPaymentMessage(json, mac);
    expect(result.status).toBe("CANCELLED");
  });

  it("verifies EXPIRED status", () => {
    const { json, mac } = makeMessage({ status: "EXPIRED" });
    const result = verifyPaymentMessage(json, mac);
    expect(result.status).toBe("EXPIRED");
  });

  it("verifies PENDING status (non-terminal)", () => {
    const { json, mac } = makeMessage({ status: "PENDING" });
    const result = verifyPaymentMessage(json, mac);
    expect(result.status).toBe("PENDING");
  });

  it("verifies REFUNDED status", () => {
    const { json, mac } = makeMessage({ status: "REFUNDED" });
    const result = verifyPaymentMessage(json, mac);
    expect(result.status).toBe("REFUNDED");
  });

  it("rejects a message with wrong MAC", () => {
    const { json } = makeMessage();
    expect(() => verifyPaymentMessage(json, "0000000000000000")).toThrow("invalid_payment_mac");
  });

  it("rejects a message from a different shop", () => {
    const { json, mac } = makeMessage({ shop: "other-shop-id" });
    expect(() => verifyPaymentMessage(json, mac)).toThrow("invalid_payment_shop");
  });

  it("rejects a message with missing required fields", () => {
    expect(() => verifyPaymentMessage("{}", calculateMaksekeskusMac("{}", "test-secret-32-bytes-minimum-xx")))
      .toThrow();
  });

  it("generates a unique eventId per status change", () => {
    const completed = makeMessage({ status: "COMPLETED" });
    const refunded = makeMessage({ status: "REFUNDED", message_time: "2025-01-02T12:00:00+02:00" });
    const result1 = verifyPaymentMessage(completed.json, completed.mac);
    const result2 = verifyPaymentMessage(refunded.json, refunded.mac);
    expect(result1.eventId).not.toBe(result2.eventId);
    expect(result2.status).toBe("REFUNDED");
  });

  it("generates a SHA-256 payload hash for audit trails", () => {
    const { json, mac } = makeMessage();
    const result = verifyPaymentMessage(json, mac);
    expect(result.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.payloadHash.length).toBe(64);
  });
});

describe("verifyPaymentReturn", () => {
  it("parses URL-encoded return body", () => {
    const payload = {
      amount: "27.60", currency: "EUR", message_time: "2025-01-01T12:00:00+02:00",
      message_type: "payment_return", reference: "TNP-2025-000001", shop: "test-shop-id",
      status: "COMPLETED", transaction: "550e8400-e29b-41d4-a716-446655440000",
    };
    const json = JSON.stringify(payload);
    const mac = calculateMaksekeskusMac(json, "test-secret-32-bytes-minimum-xx");
    const raw = `json=${encodeURIComponent(json)}&mac=${encodeURIComponent(mac)}`;
    const result = verifyPaymentReturn(raw);
    expect(result.status).toBe("COMPLETED");
    expect(result.amount).toBe("27.60");
  });

  it("rejects return with missing json param", () => {
    expect(() => verifyPaymentReturn("mac=somevalue")).toThrow("invalid_payment_message");
  });

  it("rejects return with missing mac param", () => {
    const payload = JSON.stringify({
      status: "COMPLETED", reference: "x", amount: "1", currency: "EUR",
      message_time: "t", message_type: "x", shop: "test-shop-id",
      transaction: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(() => verifyPaymentReturn(`json=${encodeURIComponent(payload)}`)).toThrow("invalid_payment_message");
  });

  it("rejects a cancelled return with invalid MAC", () => {
    const payload = JSON.stringify({
      amount: "27.60", currency: "EUR", message_time: "2025-01-01T12:00:00+02:00",
      message_type: "payment_return", reference: "TNP-2025-000001", shop: "test-shop-id",
      status: "CANCELLED", transaction: "550e8400-e29b-41d4-a716-446655440000",
    });
    const raw = `json=${encodeURIComponent(payload)}&mac=ffff`;
    expect(() => verifyPaymentReturn(raw)).toThrow("invalid_payment_mac");
  });
});

describe("payment message idempotency scenarios", () => {
  it("two calls with same message produce identical eventId (duplicate callback)", () => {
    const { json, mac } = makeMsg();
    const r1 = verifyPaymentMessage(json, mac);
    const r2 = verifyPaymentMessage(json, mac);
    expect(r1.eventId).toBe(r2.eventId);
    expect(r1.payloadHash).toBe(r2.payloadHash);
  });

  it("two calls with different status produce different eventId (callback then settlement)", () => {
    const p1 = makeMsg({ status: "PENDING" });
    const p2 = makeMsg({ status: "COMPLETED", message_time: "2025-01-02T12:00:00+02:00" });
    expect(verifyPaymentMessage(p1.json, p1.mac).eventId)
      .not.toBe(verifyPaymentMessage(p2.json, p2.mac).eventId);
  });

  it("duplicate COMPLETED across different message times produces unique eventId", () => {
    const p1 = makeMsg({ status: "COMPLETED", message_time: "2025-01-01T10:00:00+02:00" });
    const p2 = makeMsg({ status: "COMPLETED", message_time: "2025-01-01T11:00:00+02:00" });
    expect(verifyPaymentMessage(p1.json, p1.mac).eventId)
      .not.toBe(verifyPaymentMessage(p2.json, p2.mac).eventId);
  });

  function makeMsg(overrides: Record<string, unknown> = {}) {
    const payload = {
      amount: "50.00", currency: "EUR", message_time: "2025-01-01T12:00:00+02:00",
      message_type: "payment_return", reference: "TNP-2025-001", shop: "test-shop-id",
      status: "COMPLETED", transaction: "550e8400-e29b-41d4-a716-446655440000",
      ...overrides,
    };
    const json = JSON.stringify(payload);
    const mac = calculateMaksekeskusMac(json, "test-secret-32-bytes-minimum-xx");
    return { json, mac, payload };
  }
});

describe("amount edge cases", () => {
  it("handles integer euro amount (e.g. 15 EUR)", () => {
    expect(euroDecimalToCents("15")).toBe(1500);
  });

  it("handles zero amount (free order)", () => {
    expect(euroDecimalToCents("0")).toBe(0);
  });

  it("handles amount with trailing zero in cents", () => {
    expect(euroDecimalToCents("10.50")).toBe(1050);
  });

  it("handles large order amount", () => {
    expect(euroDecimalToCents("999.99")).toBe(99999);
  });
});

import { calculateShippingCost } from "../shipping/config";

describe("shipping cost calculation", () => {
  it("charges 5 EUR for Omniva under 40 EUR cart total", () => {
    expect(calculateShippingCost("omniva", 39.99)).toBe(5.0);
  });

  it("free delivery for Omniva at 40 EUR and above", () => {
    expect(calculateShippingCost("omniva", 40)).toBe(0);
    expect(calculateShippingCost("omniva", 100)).toBe(0);
  });

  it("charges 3.50 EUR for Smartpost under 40 EUR", () => {
    expect(calculateShippingCost("smartpost", 20)).toBe(3.5);
  });

  it("free delivery for Smartpost at 40 EUR and above", () => {
    expect(calculateShippingCost("smartpost", 40)).toBe(0);
  });

  it("charges 5 EUR for courier under 40 EUR", () => {
    expect(calculateShippingCost("courier", 10)).toBe(5.0);
  });

  it("free delivery for courier at 40 EUR and above", () => {
    expect(calculateShippingCost("courier", 40)).toBe(0);
  });

  it("returns 0 for unknown carrier", () => {
    expect(calculateShippingCost("dpd", 10)).toBe(0);
  });

  it("order total with delivery is exactly subtotal + shipping", () => {
    const subtotal = 35;
    const shipping = calculateShippingCost("omniva", subtotal);
    expect(shipping).toBe(5.0);
    const total = subtotal + shipping;
    expect(total).toBe(40);
    expect(euroDecimalToCents(String(total))).toBe(4000);
  });

  it("delivery charge rounds correctly to cents", () => {
    const subtotal = 39.99;
    const shipping = calculateShippingCost("omniva", subtotal);
    const total = subtotal + shipping;
    expect(euroDecimalToCents(total.toFixed(2))).toBe(4499);
  });
});
