<<<<<<< HEAD
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
=======
import { describe, expect, it, vi } from "vitest";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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

<<<<<<< HEAD
vi.mock("@/lib/maksekeskus/config", () => ({
  maksekeskusConfig: () => ({
    mode: "test" as const,
    shopId: "test-shop-id",
    secret: "test-secret-32-bytes-minimum-xx",
    base: "https://api.test.maksekeskus.ee",
  }),
}));

import { createPayment, verifyPaymentMessage, verifyPaymentReturn } from "../payments/maksekeskus";
=======
import { verifyPaymentMessage, verifyPaymentReturn } from "../payments/maksekeskus";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

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

<<<<<<< HEAD
  it("returns 0 for unknown carrier (e.g. courier no longer supported)", () => {
    expect(calculateShippingCost("courier", 10)).toBe(0);
  });

  it("returns 0 for completely unknown carrier", () => {
=======
  it("charges 5 EUR for courier under 40 EUR", () => {
    expect(calculateShippingCost("courier", 10)).toBe(5.0);
  });

  it("free delivery for courier at 40 EUR and above", () => {
    expect(calculateShippingCost("courier", 40)).toBe(0);
  });

  it("returns 0 for unknown carrier", () => {
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
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
<<<<<<< HEAD

const originalFetch = globalThis.fetch;

describe("createPayment", () => {
  const validOrder = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    orderNumber: "TNP-2026-D000001",
    totalCents: 2760,
    currency: "EUR" as const,
    confirmationToken: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    customer: { name: "Test User", email: "test@example.com", country: "ee", locale: "et" },
    ip: "127.0.0.1",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockMaksekeskusResponse(overrides: Partial<{ status: number; body: Record<string, unknown> }> = {}) {
    const status = overrides.status ?? 201;
    const body = overrides.body ?? {
      id: "520e8400-e29b-41d4-a716-446655440001",
      payment_methods: {
        other: [{ name: "redirect", url: "https://payment.test.maksekeskus.ee/pay/520e8400" }],
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: vi.fn().mockResolvedValue(JSON.stringify(body)),
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Response);
  }

  it("returns redirect URL on successful payment creation", async () => {
    mockMaksekeskusResponse();
    const result = await createPayment(validOrder);
    expect(result.redirectUrl).toBe("https://payment.test.maksekeskus.ee/pay/520e8400");
    expect(result.providerTransactionId).toBe("520e8400-e29b-41d4-a716-446655440001");
  });

  it("sends the correct amount as a decimal string", async () => {
    mockMaksekeskusResponse();
    await createPayment(validOrder);
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.transaction.amount).toBe("27.60");
    expect(body.transaction.currency).toBe("EUR");
    expect(body.transaction.reference).toBe("TNP-2026-D000001");
    expect(body.transaction.merchant_data).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("sends customer details", async () => {
    mockMaksekeskusResponse();
    await createPayment(validOrder);
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.customer.ip).toBe("127.0.0.1");
    expect(body.customer.name).toBe("Test User");
    expect(body.customer.email).toBe("test@example.com");
    expect(body.customer.country).toBe("ee");
    expect(body.customer.locale).toBe("et");
  });

  it("defaults country to ee and locale to et when not provided", async () => {
    mockMaksekeskusResponse();
    await createPayment({ ...validOrder, customer: { name: "A", email: "a@b.ee" } });
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.customer.country).toBe("ee");
    expect(body.customer.locale).toBe("et");
  });

  it("sends return, cancel, and notifications URLs", async () => {
    mockMaksekeskusResponse();
    await createPayment(validOrder);
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.transaction_url.return_url).toBe("http://localhost:3000/api/maksekeskus/return");
    expect(body.transaction_url.cancel_url).toBe("http://localhost:3000/api/maksekeskus/return");
    expect(body.transaction_url.notifications_url).toBe("http://localhost:3000/api/maksekeskus/webhook");
  });

  it("throws payment_create_XXX on non-200 response", async () => {
    mockMaksekeskusResponse({ status: 400, body: { error: "bad request" } });
    await expect(createPayment(validOrder)).rejects.toThrow("payment_create_400");
  });

  it("throws payment_redirect_missing when no redirect method in response", async () => {
    mockMaksekeskusResponse({ body: { id: "520e8400-e29b-41d4-a716-446655440001", payment_methods: { other: [] } } });
    await expect(createPayment(validOrder)).rejects.toThrow("payment_redirect_missing");
  });

  it("detects TLS errors and throws maksekeskus_tls_error", async () => {
    const tlsError = new Error("fetch failed");
    (tlsError as Error & { cause?: unknown }).cause = new Error("unable to verify the first certificate");
    globalThis.fetch = vi.fn().mockRejectedValue(tlsError);
    await expect(createPayment(validOrder)).rejects.toThrow("maksekeskus_tls_error");
  });

  it("propagates non-TLS fetch errors", async () => {
    const networkError = new Error("network unreachable");
    globalThis.fetch = vi.fn().mockRejectedValue(networkError);
    await expect(createPayment(validOrder)).rejects.toThrow("network unreachable");
  });

  it("handles integer euro amounts as decimal strings", async () => {
    mockMaksekeskusResponse();
    await createPayment({ ...validOrder, totalCents: 1500 });
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.transaction.amount).toBe("15.00");
  });

  it("sends Basic auth header with shopId:secret", async () => {
    mockMaksekeskusResponse();
    await createPayment(validOrder);
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const authHeader = fetchCall[1].headers.authorization;
    const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString();
    expect(decoded).toBe("test-shop-id:test-secret-32-bytes-minimum-xx");
  });
});
=======
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc
