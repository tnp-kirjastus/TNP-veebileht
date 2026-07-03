import "server-only";

import { Resend } from "resend";
import { serverEnv } from "./env";
import { createAdminClient } from "./supabase/admin";

export async function sendOrderConfirmationEmail(params: {
  orderId: string;
  orderNumber: string;
  to: string;
  customerName: string;
  total: number;
  items: Array<{ title: string; quantity: number; price: number }>;
}) {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping confirmation email");
    return;
  }

  const db = createAdminClient();

  const outboxPayload = {
    order_id: params.orderId,
    order_number: params.orderNumber,
    customer_email: params.to,
    customer_name: params.customerName,
    total: params.total,
    items: params.items,
    provider: "resend",
    template: "order_confirmation",
  };

  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: "email.order_confirmation",
      payload: outboxPayload,
    })
    .select("id")
    .single();

  if (outboxErr || !outboxRow) {
    console.error("outbox_insert_failed", outboxErr?.message);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const itemLines = params.items.map(
    (item) => `${item.quantity} x ${item.title} — ${item.price.toFixed(2)} €`
  ).join("\n");

  try {
    await resend.emails.send({
      from: "Kirjastus Tänapäev <tellimused@tnp.ee>",
      to: params.to,
      subject: `Tellimus ${params.orderNumber} kinnitatud`,
      text: `Tere ${params.customerName}!\n\nSinu tellimus nr ${params.orderNumber} summas ${params.total.toFixed(2)} € on kinnitatud.\n\nTellitud raamatud:\n${itemLines}\n\nSaadame raamatud esimesel võimalusel. Tarne kohta saadame eraldi teavituse.\n\nKüsimuste korral kirjuta: tellimused@tnp.ee\n\nKirjastus Tänapäev`,
    });

    await db.schema("commerce").from("outbox")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", outboxRow.id);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("confirmation_email_failed", errorMsg);
    await db.schema("commerce").from("outbox")
      .update({ attempts: 1, error_code: errorMsg.slice(0, 500) })
      .eq("id", outboxRow.id);
  }
}
