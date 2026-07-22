import "server-only";

import { Resend } from "resend";
import nodemailer from "nodemailer";
import { serverEnv } from "./env";
import { createAdminClient } from "./supabase/admin";
import { getStoreSettings } from "@/lib/settings";
import {
  statusSubject,
  buildStatusUpdateHtml,
  buildNewOrderAdminHtml,
  buildOrderShippedHtml,
} from "@/lib/email-templates";

const DEFAULT_FROM = "tellimused@tnp.ee";

function getSmtpTransport() {
  const env = serverEnv();
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT ?? "587", 10),
      secure: env.SMTP_PORT === "465",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
}

async function getFromAddress(): Promise<string> {
  const settings = await getStoreSettings();
  return settings.email.fromAddress || DEFAULT_FROM;
}

export async function isNotifEnabled(statusKey: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data } = await db.schema("content").from("settings")
      .select("email")
      .eq("key", "store")
      .maybeSingle();
    if (!data) return true;
    const email = (data.email as Record<string, unknown> | null);
    const notifications = (email?.notifications as Record<string, boolean> | null);
    if (!notifications) return true;
    if (notifications[statusKey] !== undefined) return notifications[statusKey];
    return true;
  } catch {
    return true;
  }
}

async function insertOutbox(
  db: ReturnType<typeof createAdminClient>,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const { data: outboxRow, error: outboxErr } = await db.schema("commerce").from("outbox")
    .insert({
      event_type: eventType,
      payload,
    })
    .select("id")
    .single();

  if (outboxErr || !outboxRow) {
    console.error("outbox_insert_failed", { eventType, error: outboxErr?.message });
    return null;
  }
  return outboxRow.id;
}

async function markOutboxProcessed(db: ReturnType<typeof createAdminClient>, outboxId: string | null) {
  if (!outboxId) return;
  try {
    await db.schema("commerce").from("outbox")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", outboxId);
  } catch (err) {
    console.error("outbox_mark_processed_failed", err instanceof Error ? err.message : String(err));
  }
}

async function markOutboxFailed(db: ReturnType<typeof createAdminClient>, outboxId: string | null, errorMsg: string) {
  if (!outboxId) return;
  try {
    await db.schema("commerce").from("outbox")
      .update({ attempts: 1, error_code: errorMsg.slice(0, 500) })
      .eq("id", outboxId);
  } catch (err) {
    console.error("outbox_mark_failed_failed", err instanceof Error ? err.message : String(err));
  }
}

async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ success: boolean; error?: string }> {
  // 1. Try SMTP first
  const transport = getSmtpTransport();
  if (transport) {
    try {
      await transport.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("smtp_send_failed", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 2. Fall back to Resend
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    return { success: false, error: "No email transport configured (SMTP or RESEND_API_KEY)" };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    } as Parameters<typeof resend.emails.send>[0]);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("resend_send_failed", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function sendOrderConfirmationEmail(params: {
  orderId: string;
  orderNumber: string;
  to: string;
  customerName: string;
  total: number;
  items: Array<{ title: string; quantity: number; price: number }>;
}): Promise<{ success: boolean; error?: string }> {
  const settings = await getStoreSettings();
  const fromAddress = await getFromAddress();
  const subject = settings.email.orderSubject.replace("{{orderNumber}}", params.orderNumber);
  const itemLines = params.items.map(
    (item) => `${item.quantity} x ${item.title} — ${item.price.toFixed(2)} €`
  ).join("\n");
  const body = settings.email.orderBody
    .replace("{{customerName}}", params.customerName)
    .replace("{{orderNumber}}", params.orderNumber)
    .replace("{{total}}", params.total.toFixed(2))
    .replace("{{itemLines}}", itemLines);

  const db = createAdminClient();

  const outboxId = await insertOutbox(db, "email.order_confirmation", {
    order_id: params.orderId,
    order_number: params.orderNumber,
    customer_email: params.to,
    customer_name: params.customerName,
    total: params.total,
    items: params.items,
    provider: "nodemailer",
    template: "order_confirmation",
  });

  const result = await sendEmail({
    from: fromAddress,
    to: params.to,
    subject,
    text: body,
  });

  if (result.success) {
    await markOutboxProcessed(db, outboxId);
  } else {
    await markOutboxFailed(db, outboxId, result.error ?? "unknown");
  }

  return result;
}

export async function sendOrderStatusUpdate(params: {
  orderId: string;
  orderNumber: string;
  newStatus: string;
  to: string;
  customerName: string | null;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const notifKey = `notify_${params.newStatus}`;
  if (!(await isNotifEnabled(notifKey))) {
    console.log(`Notification ${notifKey} disabled, skipping status update email`);
    return { success: false, error: `Notification disabled: ${notifKey}` };
  }

  const fromAddress = await getFromAddress();
  const subject = await statusSubject(params.newStatus, params.orderNumber);
  const html = await buildStatusUpdateHtml({
    orderRef: params.orderNumber,
    customerName: params.customerName,
    newStatus: params.newStatus,
    note: params.note,
  });

  const db = createAdminClient();

  const outboxId = await insertOutbox(db, "email.status_update", {
    order_id: params.orderId,
    order_number: params.orderNumber,
    status: params.newStatus,
    customer_email: params.to,
    customer_name: params.customerName,
    note: params.note ?? null,
    provider: "nodemailer",
    template: "status_update",
  });

  const result = await sendEmail({
    from: fromAddress,
    to: params.to,
    subject,
    html,
  });

  if (result.success) {
    await markOutboxProcessed(db, outboxId);
  } else {
    await markOutboxFailed(db, outboxId, result.error ?? "unknown");
  }

  return result;
}

export async function sendOrderShippedEmail(params: {
  orderId: string;
  orderNumber: string;
  to: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isNotifEnabled("notify_shipped"))) {
    console.log("notify_shipped disabled, skipping shipped email");
    return { success: false, error: "Notification disabled: notify_shipped" };
  }

  const fromAddress = await getFromAddress();
  const subject = `Tellimus ${params.orderNumber} on saadetud`;
  const html = await buildOrderShippedHtml({
    orderRef: params.orderNumber,
    customerName: params.customerName,
    carrier: params.carrier,
    trackingNumber: params.trackingNumber,
    trackingUrl: params.trackingUrl,
  });

  const db = createAdminClient();

  const outboxId = await insertOutbox(db, "email.order_shipped", {
    order_id: params.orderId,
    order_number: params.orderNumber,
    customer_email: params.to,
    customer_name: params.customerName,
    carrier: params.carrier,
    tracking_number: params.trackingNumber,
    tracking_url: params.trackingUrl ?? null,
    provider: "nodemailer",
    template: "order_shipped",
  });

  const result = await sendEmail({
    from: fromAddress,
    to: params.to,
    subject,
    html,
  });

  if (result.success) {
    await markOutboxProcessed(db, outboxId);
  } else {
    await markOutboxFailed(db, outboxId, result.error ?? "unknown");
  }

  return result;
}

export async function sendNewOrderAdminEmail(params: {
  orderId: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isNotifEnabled("notify_pending"))) {
    console.log("notify_pending disabled, skipping new order admin email");
    return { success: false, error: "Notification disabled: notify_pending" };
  }

  const fromAddress = await getFromAddress();
  const subject = `Uus tellimus: ${params.orderNumber}`;
  const html = await buildNewOrderAdminHtml({
    orderRef: params.orderNumber,
    total: params.total,
    createdAt: params.createdAt,
    items: params.items,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
  });

  const settings = await getStoreSettings();
  const adminEmail = settings.company.email || "tellimused@tnp.ee";

  const db = createAdminClient();

  const outboxId = await insertOutbox(db, "email.admin_notification", {
    order_id: params.orderId,
    order_number: params.orderNumber,
    admin_email: adminEmail,
    total: params.total,
    provider: "nodemailer",
    template: "admin_notification",
  });

  const result = await sendEmail({
    from: fromAddress,
    to: adminEmail,
    subject,
    html,
  });

  if (result.success) {
    await markOutboxProcessed(db, outboxId);
  } else {
    await markOutboxFailed(db, outboxId, result.error ?? "unknown");
  }

  return result;
}
