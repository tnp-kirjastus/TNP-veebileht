"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ShipOrderDialog } from "@/components/admin/ShipOrderDialog";
import { useToast } from "@/components/admin/Toast";
import { updateOrderStatus, shipOrder, deleteOrders } from "@/app/haldus/order-actions";
import { formatEuro } from "@/lib/product-utils";

interface OrderItem {
  id: string;
  product_id: string | null;
  title: string;
  price: number;
  quantity: number;
}

interface HistoryEntry {
  id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  currency: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_method: string | null;
  maksekeskus_id: string | null;
  shipment_id: string | null;
  tracking_code: string | null;
  shipping_carrier: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  invoice_requested: boolean;
  company_name: string | null;
  company_reg_code: string | null;
  vat_amount: number;
  vat_percent: number;
  coupon_code: string | null;
  coupon_discount: number;
  items: OrderItem[];
  history: HistoryEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ootel",
  payment_pending: "Makse ootel",
  paid: "Makstud",
  processing: "Töötlemisel",
  shipped: "Saadetud",
  cancelled: "Tühistatud",
  payment_failed: "Makse ebaõnnestus",
  expired: "Aegunud",
  manual_review: "Käsitsi ülevaatus",
  refunded: "Tagastatud",
  preorder: "Ettetellimus",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

function mapStatusToVariant(status: string): "pending" | "paid" | "shipped" | "cancelled" | undefined {
  const m: Record<string, "pending" | "paid" | "shipped" | "cancelled" | undefined> = {
    pending: "pending",
    payment_pending: "pending",
    paid: "paid",
    processing: "paid",
    shipped: "shipped",
    cancelled: "cancelled",
    payment_failed: "cancelled",
    expired: "cancelled",
    manual_review: "pending",
    refunded: "cancelled",
    preorder: "pending",
  };
  return m[status];
}

export function OrderDetailClient({ order: initialOrder }: { order: OrderData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [order, setOrder] = useState(initialOrder);

  const [newStatus, setNewStatus] = useState(initialOrder.status);
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shipOpen, setShipOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleStatusSave() {
    if (!order || newStatus === order.status) return;
    setSaving(true);

    const formData = new FormData();
    formData.set("data", JSON.stringify({
      orderId: order.id,
      status: newStatus,
      note: note.trim() || undefined,
      sendEmail,
    }));

    startTransition(async () => {
      const result = await updateOrderStatus(undefined, formData);
      if (result?.error) {
        toast(result.error, "error");
      } else if (result?.success) {
        toast("Staatus uuendatud!", "success");
        setOrder((prev) => ({ ...prev, status: newStatus }));
        setNote("");
        router.refresh();
      }
      setSaving(false);
    });
  }

  async function handleShip(data: { carrier: string; trackingNumber: string; trackingUrl?: string }) {
    const formData = new FormData();
    formData.set("data", JSON.stringify({
      orderId: order.id,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      trackingUrl: data.trackingUrl,
    }));

    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        const result = await shipOrder(undefined, formData);
        if (result?.error) {
          reject(new Error(result.error));
        } else if (result?.success) {
          toast("Tellimus saadetud!", "success");
          setShipOpen(false);
          router.refresh();
          resolve();
        } else {
          reject(new Error("Tundmatu viga"));
        }
      });
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const formData = new FormData();
    formData.set("ids", order.id);
    const result = await deleteOrders(undefined, formData);
    if (result?.error) {
      toast(result.error, "error");
      setDeleting(false);
    } else if (result?.success) {
      toast("Tellimus kustutatud.", "success");
      router.push("/haldus/tellimused");
    } else {
      setDeleting(false);
    }
  }

  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-6">

        {/* Current status card */}
        <div className="border border-line bg-panel p-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <StatusBadge
              variant={mapStatusToVariant(order.status) ?? "pending"}
              label={STATUS_LABELS[order.status] ?? order.status}
            />
            {order.paid_at && (
              <span className="text-xs text-muted">Makstud: {new Date(order.paid_at).toLocaleString("et-EE")}</span>
            )}
            {order.shipped_at && (
              <span className="text-xs text-muted">Saadetud: {new Date(order.shipped_at).toLocaleString("et-EE")}</span>
            )}
            {order.delivered_at && (
              <span className="text-xs text-muted">Kohale toimetatud: {new Date(order.delivered_at).toLocaleString("et-EE")}</span>
            )}
            {order.cancelled_at && (
              <span className="text-xs text-muted">Tühistatud: {new Date(order.cancelled_at).toLocaleString("et-EE")}</span>
            )}
          </div>

          {/* Status change controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-xs mb-1">Uus staatus</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-line px-3 py-2.5 text-sm bg-paper"
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-xs mb-1">Märkus (valikuline)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nt. pakk saadetud Omnivaga"
                className="w-full border border-line px-3 py-2.5 text-sm bg-paper"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="accent-ink h-4 w-4"
              />
              Saada kliendile e-kiri
            </label>
            <button
              type="button"
              disabled={saving || isPending || newStatus === order.status}
              onClick={handleStatusSave}
              className="px-4 py-2 text-sm font-bold border border-ink bg-white text-ink hover:bg-ink hover:text-white disabled:opacity-50"
            >
              {saving ? "Salvestan..." : "Salvesta"}
            </button>
            {order.status === "paid" && (
              <button
                type="button"
                onClick={() => setShipOpen(true)}
                className="px-4 py-2 text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                Saada teele
              </button>
            )}
          </div>

          {/* Tracking info if shipped */}
          {order.tracking_code && (
            <div className="mt-4 p-4 bg-soft/50 border border-line grid gap-1 text-sm">
              <div className="font-bold text-xs uppercase text-muted">Jälgimisinfo</div>
              <div>Kuller: <strong>{order.shipping_carrier}</strong></div>
              <div>Jälgimisnumber: <strong className="font-mono">{order.tracking_code}</strong></div>
            </div>
          )}
        </div>

        {/* Order items */}
        <div className="border border-line bg-panel">
          <div className="p-6 border-b border-line">
            <h2 className="font-heading text-lg">Tellitud tooted ({order.items.length} rida, {totalItems} tk)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-soft">
              <tr>
                <th className="p-4 text-left font-extrabold text-xs uppercase text-muted">Toode</th>
                <th className="p-4 text-center font-extrabold text-xs uppercase text-muted">Kogus</th>
                <th className="p-4 text-right font-extrabold text-xs uppercase text-muted">Hind</th>
                <th className="p-4 text-right font-extrabold text-xs uppercase text-muted">Summa</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="p-4 font-bold">{item.title}</td>
                  <td className="p-4 text-center">{item.quantity}</td>
                  <td className="p-4 text-right">{formatEuro(item.price)}</td>
                  <td className="p-4 text-right font-bold">{formatEuro(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-line space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Vahesumma</span>
              <span className="font-bold">{formatEuro(order.subtotal)}</span>
            </div>
            {order.shipping_cost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Tarne</span>
                <span className="font-bold">{formatEuro(order.shipping_cost)}</span>
              </div>
            )}
            {order.coupon_discount > 0 && (
              <div className="flex justify-between text-accent">
                <span>Sooduskood ({order.coupon_code})</span>
                <span className="font-bold">-{formatEuro(order.coupon_discount)}</span>
              </div>
            )}
            {order.vat_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">KM ({order.vat_percent}%)</span>
                <span className="font-bold">{formatEuro(order.vat_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 mt-1">
              <span className="font-bold">Kokku</span>
              <span className="font-heading text-lg">{formatEuro(order.total)} {order.currency}</span>
            </div>
          </div>
        </div>

        {/* Status history */}
        <div className="border border-line bg-panel">
          <div className="p-6 border-b border-line">
            <h2 className="font-heading text-lg">Staatuse ajalugu</h2>
          </div>
          <div className="p-6">
            {order.history.length === 0 ? (
              <p className="text-muted text-sm">Ajalugu puudub</p>
            ) : (
              <ol className="space-y-3">
                {order.history.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-ink flex-shrink-0" />
                    <div>
                      <StatusBadge
                        variant={mapStatusToVariant(h.status) ?? "pending"}
                        label={STATUS_LABELS[h.status] ?? h.status}
                      />
                      {" "}
                      <span className="text-muted text-xs ml-2">
                        {new Date(h.created_at).toLocaleString("et-EE")}
                      </span>
                      {h.note && <p className="text-muted mt-0.5">{h.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">

        {/* Order info */}
        <div className="border border-line bg-panel p-6 space-y-3">
          <h2 className="font-heading text-lg">Tellimuse info</h2>
          <div className="text-sm space-y-2">
            <div>
              <span className="text-muted">Number</span>
              <p className="font-bold font-mono">{order.order_number}</p>
            </div>
            <div>
              <span className="text-muted">Loodud</span>
              <p className="font-medium">{new Date(order.created_at).toLocaleString("et-EE")}</p>
            </div>
            <div>
              <span className="text-muted">Uuendatud</span>
              <p className="font-medium">{new Date(order.updated_at).toLocaleString("et-EE")}</p>
            </div>
            {order.maksekeskus_id && (
              <div>
                <span className="text-muted">Maksekeskus ID</span>
                <p className="font-mono text-xs">{order.maksekeskus_id}</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer info */}
        <div className="border border-line bg-panel p-6 space-y-2">
          <h2 className="font-heading text-lg">Klient</h2>
          <div className="text-sm space-y-1">
            <p className="font-bold">{order.customer_name}</p>
            {order.customer_email && (
              <p className="text-muted">
                <a href={`mailto:${order.customer_email}`} className="hover:text-ink">{order.customer_email}</a>
              </p>
            )}
            {order.customer_phone && (
              <p className="text-muted">{order.customer_phone}</p>
            )}
            {order.company_name && (
              <p className="text-muted">{order.company_name}{order.company_reg_code ? ` (${order.company_reg_code})` : ""}</p>
            )}
          </div>
        </div>

        {/* Shipping info */}
        {(order.shipping_address || order.shipping_method) && (
          <div className="border border-line bg-panel p-6 space-y-2">
            <h2 className="font-heading text-lg">Tarne</h2>
            <div className="text-sm space-y-1">
              {order.shipping_method && (
                <p className="font-bold">{order.shipping_method === "omniva" ? "Omniva" : order.shipping_method === "smartpost" ? "Smartpost" : order.shipping_method}</p>
              )}
              {order.shipping_address && (
                <p className="text-muted whitespace-pre-wrap">{order.shipping_address}</p>
              )}
            </div>
          </div>
        )}

        {/* Delete button */}
        <button
          type="button"
          disabled={deleting || isPending}
          onClick={() => setDeleteOpen(true)}
          className="w-full px-4 py-2.5 text-sm font-bold text-accent border border-accent/20 hover:bg-accent/5 disabled:opacity-50"
        >
          {deleting ? "Kustutan..." : "Kustuta tellimus"}
        </button>
      </div>

      {/* Ship dialog */}
      {shipOpen && (
        <ShipOrderDialog
          onShip={handleShip}
          onCancel={() => setShipOpen(false)}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Kustuta tellimus"
        message="Oled kindel, et soovid selle tellimuse kustutada? Seda tegevust ei saa tagasi võtta."
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
