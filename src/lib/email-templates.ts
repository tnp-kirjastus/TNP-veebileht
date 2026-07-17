import "server-only";

const PRIMARY = "#4a1aa1";
const LIGHT_BG = "#f8fafc";
const STORE_NAME = "Kirjastus Tänapäev";

function layout(content: string) {
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
          <td style="background:${PRIMARY};padding:28px 32px;">
            <div style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">${STORE_NAME}</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${content}</td></tr>
        <tr>
          <td style="background:#f1f5f9;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:13px;color:#64748b;">
              ${STORE_NAME} — <a href="https://tnp.ee" style="color:${PRIMARY};">tnp.ee</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

function statusHeading(status: string): string {
  const map: Record<string, string> = {
    pending: "Tellimus ootab makset",
    payment_pending: "Tellimus ootab makset",
    paid: "Aitäh tellimuse eest!",
    processing: "Tellimus on töötlemisel",
    shipped: "Tellimus on saadetud",
    delivered: "Tellimus on kohale toimetatud",
    cancelled: "Tellimus on tühistatud",
    payment_failed: "Makse ebaõnnestus",
    expired: "Tellimus on aegunud",
    manual_review: "Tellimus on ülevaatusel",
    refunded: "Tellimus on tagastatud",
    preorder: "Ettetellimus vastu võetud",
  };
  return map[status] ?? "Tellimuse staatus on uuendatud";
}

export function statusSubject(status: string, orderNumber: string): string {
  const map: Record<string, string> = {
    pending: "ootab makset",
    payment_pending: "ootab makset",
    paid: "makse kinnitatud",
    processing: "on töötlemisel",
    shipped: "on saadetud",
    delivered: "on kohale toimetatud",
    cancelled: "on tühistatud",
    payment_failed: "makse ebaõnnestus",
    expired: "on aegunud",
    manual_review: "on ülevaatusel",
    refunded: "on tagastatud",
    preorder: "vastu võetud",
  };
  const suffix = map[status] ?? "staatuse uuendus";
  return `${STORE_NAME}: Tellimus ${orderNumber} ${suffix}`;
}

function statusBody(status: string, customerName: string | null, orderRef: string): string {
  const name = customerName ? `, <strong>${customerName}</strong>` : "";
  const bodies: Record<string, string> = {
    pending: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> on registreeritud ja ootab makset. Makse kinnitusel asume seda komplekteerima.`,
    payment_pending: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> ootab makset. Makse kinnitusel asume seda komplekteerima.`,
    paid: `Tere${name}! Makse on kinnitatud. Saime teie tellimuse kätte ning asume seda komplekteerima. Saadame peatselt teavituse, kui tellimus on teele pandud.`,
    processing: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> on töötlemisel. Tegeleme selle komplekteerimisega.`,
    shipped: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> on üle antud kullerile ja on teel Teieni.`,
    delivered: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> on kohale toimetatud. Täname ostu eest!`,
    cancelled: `Tere${name}! Teie tellimus <strong>#${orderRef}</strong> on tühistatud. Küsimuste korral võtke meiega ühendust.`,
    payment_failed: `Tere${name}! Tellimuse <strong>#${orderRef}</strong> makse ebaõnnestus. Palun proovige uuesti.`,
    expired: `Tere${name}! Tellimus <strong>#${orderRef}</strong> on aegunud. Soovi korral saate teha uue tellimuse.`,
    manual_review: `Tere${name}! Tellimus <strong>#${orderRef}</strong> vajab käsitsi ülevaatust. Võtame peatselt ühendust.`,
    refunded: `Tere${name}! Tellimuse <strong>#${orderRef}</strong> summa on tagastatud.`,
    preorder: `Tere${name}! Teie ettetellimus <strong>#${orderRef}</strong> on vastu võetud. Anname teada, kui raamatud on saadaval.`,
  };
  return bodies[status] ?? `Tere${name}! Tellimuse <strong>#${orderRef}</strong> staatus on muutunud: <strong>${STATUS_LABELS[status] ?? status}</strong>.`;
}

export interface StatusUpdateData {
  orderRef: string;
  customerName: string | null;
  newStatus: string;
  note?: string;
}

export function buildStatusUpdateHtml(d: StatusUpdateData): string {
  const heading = statusHeading(d.newStatus);
  const body = statusBody(d.newStatus, d.customerName, d.orderRef);

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;color:#1a202c;">${heading}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
      ${body}
    </p>

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
      Küsimuste korral võtke ühendust: <a href="mailto:tellimused@tnp.ee" style="color:${PRIMARY};">tellimused@tnp.ee</a>
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

export function buildNewOrderAdminHtml(d: NewOrderAdminData): string {
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
      <div style="font-size:18px;font-weight:bold;color:${PRIMARY};">#${d.orderRef}</div>
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

    <div style="text-align:right;font-size:17px;font-weight:bold;color:${PRIMARY};margin-bottom:24px;">
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

export function buildOrderShippedHtml(d: OrderShippedData): string {
  const trackingLink = d.trackingUrl
    ? `<a href="${d.trackingUrl}" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Jälgi saadetist</a>`
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
      <div style="font-size:13px;font-weight:600;color:${PRIMARY};margin-bottom:6px;">Tarneinfo</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${d.carrier}</div>
      <div style="font-size:14px;font-family:monospace;">Jälgimisnumber: ${d.trackingNumber}</div>
    </div>

    ${trackingLink ? `<div style="margin-bottom:24px;">${trackingLink}</div>` : ""}

    <p style="margin:0;font-size:14px;color:#64748b;">
      Küsimuste korral võtke ühendust: <a href="mailto:tellimused@tnp.ee" style="color:${PRIMARY};">tellimused@tnp.ee</a>
    </p>`;

  return layout(content);
}
