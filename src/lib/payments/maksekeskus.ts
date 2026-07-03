import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { serverEnv, siteUrl } from "@/lib/env";
import { verifyMaksekeskusMac } from "./mac";

const transactionResponse = z.object({
  id: z.string().uuid(),
  payment_methods: z.object({
    other: z.array(z.object({ name: z.string(), url: z.url() })).default([]),
  }).passthrough(),
}).passthrough();

const paymentReturn = z.object({
  amount: z.union([z.string(), z.number()]).transform(String),
  currency: z.string(),
  customer_name: z.string().optional(),
  merchant_data: z.string().optional(),
  message_time: z.string(),
  message_type: z.string().min(1),
  reference: z.string(),
  shop: z.string(),
  status: z.enum(["CREATED", "PENDING", "CANCELLED", "EXPIRED", "APPROVED", "COMPLETED", "PART_REFUNDED", "REFUNDED"]),
  transaction: z.string().uuid(),
}).passthrough();

export interface PaymentOrder {
  id: string;
  orderNumber: string;
  totalCents: number;
  currency: "EUR";
  confirmationToken: string;
  customer: { name: string; email: string; country?: string; locale?: string };
  ip: string;
}

export interface VerifiedPaymentEvent {
  eventId: string;
  providerTransactionId: string;
  status: z.infer<typeof paymentReturn>["status"];
  amount: string;
  currency: string;
  merchantIdentity: string;
  orderReference: string;
  eventTime: string;
  payloadHash: string;
}

function configuration() {
  const env = serverEnv();
  if (!env.MAKSEKESKUS_SHOP_ID || !env.MAKSEKESKUS_SECRET) throw new Error("payments_not_configured");
  return { shopId: env.MAKSEKESKUS_SHOP_ID, secret: env.MAKSEKESKUS_SECRET, base: "https://api.maksekeskus.ee" };
}

export async function createPayment(order: PaymentOrder) {
  const config = configuration();
  const base = siteUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${config.base}/v1/transactions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secret}`).toString("base64")}` },
      body: JSON.stringify({
        amount: `${Math.floor(order.totalCents / 100)}.${String(order.totalCents % 100).padStart(2, "0")}`, currency: order.currency, ip: order.ip,
        reference: order.orderNumber, merchant_data: order.id,
        customer: { name: order.customer.name, email: order.customer.email, country: order.customer.country ?? "ee", locale: order.customer.locale ?? "et" },
        transaction_url: {
          return_url: new URL("/api/maksekeskus/return", base).toString(),
          cancel_url: new URL("/api/maksekeskus/return", base).toString(),
          notifications_url: new URL("/api/maksekeskus/webhook", base).toString(),
        },
      }),
    });
    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch { /* ignore */ }
      const preview = body.length > 500 ? body.slice(0, 500) + "..." : body;
      console.error("maksekeskus_create_error", { status: response.status, body: preview });
      throw new Error(`payment_create_${response.status}`);
    }
    const result = transactionResponse.parse(await response.json());
    const redirect = result.payment_methods.other.find((method) => method.name === "redirect");
    if (!redirect) throw new Error("payment_redirect_missing");
    return { providerTransactionId: result.id, redirectUrl: redirect.url };
  } finally { clearTimeout(timeout); }
}

export function verifyPaymentReturn(rawBody: string): VerifiedPaymentEvent {
  const params = new URLSearchParams(rawBody);
  const json = params.get("json");
  const receivedMac = params.get("mac");
  if (!json || !receivedMac) throw new Error("invalid_payment_message");
  return verifyPaymentMessage(json, receivedMac);
}

export function verifyPaymentMessage(json: string, mac: string): VerifiedPaymentEvent {
  const config = configuration();
  if (!verifyMaksekeskusMac(json, config.secret, mac)) throw new Error("invalid_payment_mac");
  const message = paymentReturn.parse(JSON.parse(json));
  if (message.shop !== config.shopId) throw new Error("invalid_payment_shop");
  return { eventId: `${message.transaction}:${message.status}:${message.message_time}`, providerTransactionId: message.transaction, status: message.status, amount: message.amount, currency: message.currency, merchantIdentity: message.shop, orderReference: message.reference, eventTime: message.message_time, payloadHash: createHash("sha256").update(json).digest("hex") };
}
