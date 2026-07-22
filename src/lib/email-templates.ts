import "server-only";

import { getStoreSettings } from "@/lib/settings";
import type { EmailStatusTemplate } from "@/lib/settings";

const PRIMARY = "#4a1aa1";
const LIGHT_BG = "#f8fafc";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ootel",
  payment_pending: "Makse ootel",
  paid: "Makstud",
  processing: "Töötlemisel",
  shipped: "Saadetud",
  delivered: "Kohale toimetatud",
  cancelled: "Tühistatud",
  payment_failed: "Makse ebaõnnestus",
  expired: "Aegunud",
  manual_review: "Käsitsi ülevaatus",
  refunded: "Tagastatud",
  preorder: "Ettetellimus",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  payment_pending: "#94a3b8",
  paid: "#16a34a",
  processing: "#2563eb",
  shipped: "#d97706",
  delivered: "#16a34a",
  cancelled: "#dc2626",
  payment_failed: "#dc2626",
  expired: "#e11d48",
  manual_review: "#ca8a04",
  refunded: "#dc2626",
  preorder: "#94a3b8",
};

async function getTheme() {
  try {
    const settings = await getStoreSettings();
    return {
      primary: settings.theme.accentColor || PRIMARY,
      storeName: settings.company.name || "Kirjastus Tänapäev",
      contactEmail: settings.email.contactEmail || "tellimused@tnp.ee",
      storeUrl: "https://tnp.ee",
    };
  } catch {
    return {
      primary: PRIMARY,
      storeName: "Kirjastus Tänapäev",
      contactEmail: "tellimused@tnp.ee",
      storeUrl: "https://tnp.ee",
    };
  }
}

async function layout(content: string) {
  const theme = await getTheme();
  return `<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${theme.primary};padding:28px 32px;">
            <div style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">${theme.storeName}</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:13px;color:#64748b;">
              ${theme.storeName} — <a href="${theme.storeUrl}" style="color:${theme.primary};">tnp.ee</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function resolveTemplate(template: EmailStatusTemplate | undefined, status: string): EmailStatusTemplate {
  if (template) return template;

  const defaults: Record<string, EmailStatusTemplate> = {
    pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
    payment_pending: { subject: "Tellimus {{orderNumber}} ootab makset", heading: "Tellimus ootab makset", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.</p>" },
    paid: { subject: "Tellimus {{orderNumber}} makse kinnitatud", heading: "Aitäh tellimuse eest!", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.</p>" },
    processing: { subject: "Tellimus {{orderNumber}} on töötlemisel", heading: "Tellimus on töötlemisel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.</p>" },
    shipped: { subject: "Tellimus {{orderNumber}} on saadetud", heading: "Tellimus on saadetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on üle antud kullerile ja on teel Teieni.</p>" },
    delivered: { subject: "Tellimus {{orderNumber}} on kohale toimetatud", heading: "Tellimus on kohale toimetatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on kohale toimetatud. Täname ostu eest!</p>" },
    cancelled: { subject: "Tellimus {{orderNumber}} on tühistatud", heading: "Tellimus on tühistatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie tellimus <strong>#{{orderNumber}}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.</p>" },
    payment_failed: { subject: "Tellimus {{orderNumber}} makse ebaõnnestus", heading: "Makse ebaõnnestus", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> makse ebaõnnestus. Palun proovige uuesti.</p>" },
    expired: { subject: "Tellimus {{orderNumber}} on aegunud", heading: "Tellimus on aegunud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> on aegunud. Soovi korral saate teha uue tellimuse.</p>" },
    manual_review: { subject: "Tellimus {{orderNumber}} on ülevaatusel", heading: "Tellimus on ülevaatusel", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimus <strong>#{{orderNumber}}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.</p>" },
    refunded: { subject: "Tellimus {{orderNumber}} on tagastatud", heading: "Tellimus on tagastatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> summa on tagastatud.</p>" },
    preorder: { subject: "Ettetellimus {{orderNumber}} vastu võetud", heading: "Ettetellimus vastu võetud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Teie ettetellimus <strong>#{{orderNumber}}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.</p>" },
  };
  return defaults[status] ?? { subject: "Tellimus {{orderNumber}} staatuse uuendus", heading: "Tellimuse staatus on uuendatud", bodyHtml: "<p>Tere{{#customerName}}, <strong>{{customerName}}</strong>{{/customerName}}! Tellimuse <strong>#{{orderNumber}}</strong> staatus on muutunud: <strong>{{statusLabel}}</strong>.</p>" };
}

function renderTemplate(tpl: EmailStatusTemplate, vars: Record<string, string>): { heading: string; bodyHtml: string } {
  let heading = tpl.heading;
  let bodyHtml = tpl.bodyHtml;

  const hasCustomerName = vars.customerName && vars.customerName.length > 0;
  bodyHtml = bodyHtml.replace(/\{\{#customerName\}\}[\s\S]*?\{\{\/customerName\}\}/g, hasCustomerName ? "" : "");

  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    heading = heading.replaceAll(placeholder, value);
    bodyHtml = bodyHtml.replaceAll(placeholder, value);
  }

  bodyHtml = bodyHtml.replace(/<strong>\s*<\/strong>/g, "");
  bodyHtml = bodyHtml.replace(/,\s*<\/strong>/g, "</strong>");

  return { heading, bodyHtml };
}

export async function statusSubject(status: string, orderNumber: string): Promise<string> {
  let settings;
  try { settings = await getStoreSettings(); } catch { /* use defaults */ }
  const tpl = resolveTemplate(settings?.email?.statusTemplates?.[status], status);
  return tpl.subject.replace("{{orderNumber}}", orderNumber);
}

export interface StatusUpdateData {
  orderRef: string;
  customerName: string | null;
  newStatus: string;
  note?: string;
}

export async function buildStatusUpdateHtml(d: StatusUpdateData): Promise<string> {
  const theme = await getTheme();
  let settings;
  try { settings = await getStoreSettings(); } catch { /* use defaults */ }

  const tpl = resolveTemplate(settings?.email?.statusTemplates?.[d.newStatus], d.newStatus);
  const rendered = renderTemplate(tpl, {
    orderNumber: d.orderRef,
    customerName: d.customerName ?? "",
    statusLabel: STATUS_LABELS[d.newStatus] ?? d.newStatus,
  });

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a202c;">${rendered.heading}</h1>
    <div style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
      ${rendered.bodyHtml}
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Tellimuse number</div>
      <div style="font-size:17px;font-weight:bold;color:#1a202c;">#${d.orderRef}</div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:13px;color:#64748b;margin-bottom:8px;">Staatus</div>
      <span style="display:inline-block;background:${STATUS_COLORS[d.newStatus] ?? "#94a3b8"}22;color:${STATUS_COLORS[d.newStatus] ?? "#94a3b8"};padding:6px 14px;border-radius:20px;font-size:15px;font-weight:600;">
        ${STATUS_LABELS[d.newStatus] ?? d.newStatus}
      </span>
    </div>

    ${d.note ? `
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:4px;">Märkus</div>
      <div style="font-size:15px;color:#78350f;">${d.note}</div>
    </div>` : ""}

    <p style="margin:0;font-size:14px;color:#64748b;">
      Küsimuste korral võtke ühendust: <a href="mailto:${theme.contactEmail}" style="color:${theme.primary};">${theme.contactEmail}</a>
    </p>`;

  return layout(content);
}

export interface NewOrderAdminData {
  orderRef: string;
  total: number;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string | null;
}

export async function buildNewOrderAdminHtml(d: NewOrderAdminData): Promise<string> {
  const theme = await getTheme();
  const itemsHtml = d.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">${item.productName}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;">${(item.quantity * item.unitPrice).toFixed(2)} €</td>
    </tr>`).join("");

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a202c;">Uus tellimus saabunud</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">
      ${new Date(d.createdAt).toLocaleString("et-EE")}
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Tellimuse number</div>
      <div style="font-size:18px;font-weight:bold;color:${theme.primary};">#${d.orderRef}</div>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:600;color:#64748b;margin-bottom:8px;">Kliendi andmed</div>
      ${d.customerName ? `<div style="font-size:15px;font-weight:600;">${d.customerName}</div>` : ""}
      ${d.customerEmail ? `<div style="font-size:14px;color:#64748b;">${d.customerEmail}</div>` : ""}
      ${d.customerPhone ? `<div style="font-size:14px;color:#64748b;">${d.customerPhone}</div>` : ""}
    </div>

    <h3 style="margin:0 0 10px;font-size:15px;font-weight:600;">Tellitud tooted</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsHtml}
    </table>

    <div style="text-align:right;font-size:17px;font-weight:bold;color:${theme.primary};margin-bottom:24px;">
      Kokku: ${d.total.toFixed(2)} €
    </div>`;

  return layout(content);
}

export interface OrderShippedData {
  orderRef: string;
  customerName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}

export async function buildOrderShippedHtml(d: OrderShippedData): Promise<string> {
  const theme = await getTheme();
  const trackingLink = d.trackingUrl
    ? `<a href="${d.trackingUrl}" style="display:inline-block;background:${theme.primary};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Jälgi saadetist</a>`
    : "";

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a202c;">Tellimus on saadetud!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
      Tere, <strong>${d.customerName}</strong>! Teie tellimus <strong>#${d.orderRef}</strong> on üle antud kullerile ja on teel Teieni.
    </p>

    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#64748b;margin-bottom:4px;">Tellimuse number</div>
      <div style="font-size:17px;font-weight:bold;color:#1a202c;">#${d.orderRef}</div>
    </div>

    <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:13px;font-weight:600;color:${theme.primary};margin-bottom:6px;">Tarneinfo</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${d.carrier}</div>
      <div style="font-size:14px;font-family:monospace;">Jälgimisnumber: ${d.trackingNumber}</div>
    </div>

    ${trackingLink ? `<div style="margin-bottom:24px;">${trackingLink}</div>` : ""}

    <p style="margin:0;font-size:14px;color:#64748b;">
      Küsimuste korral võtke ühendust: <a href="mailto:${theme.contactEmail}" style="color:${theme.primary};">${theme.contactEmail}</a>
    </p>`;

  return layout(content);
}
