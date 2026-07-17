"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { deleteOrders } from "@/app/haldus/order-actions";
import { formatEuro } from "@/lib/product-utils";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string;
}

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

const statusLabels: Record<string, string> = {
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

export function OrdersTable({
  orders,
  totalCount,
  page,
  totalPages,
  queryParams,
}: {
  orders: Order[];
  totalCount: number;
  page: number;
  totalPages: number;
  queryParams: Record<string, string>;
}) {
  function buildPageHref(p: number) {
    const parts: string[] = [];
    const entries = Object.entries(queryParams);
    for (const [key, value] of entries) {
      if (key !== "page" && value) parts.push(`${key}=${encodeURIComponent(value)}`);
    }
    if (p > 1) parts.push(`page=${p}`);
    return `/haldus/tellimused${parts.length ? "?" + parts.join("&") : ""}`;
  }
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  }

  function handleBatchDelete() {
    const formData = new FormData();
    formData.set("ids", Array.from(selectedIds).join(","));
    startTransition(async () => {
      const result = await deleteOrders(undefined, formData);
      if (result?.error) {
        toast(result.error, "error");
      } else if (result?.success) {
        toast(`${selectedIds.size} tellimus(t) kustutatud.`, "success");
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
      }
    });
  }

  function handleSingleDelete() {
    if (!singleDeleteId) return;
    const formData = new FormData();
    formData.set("ids", singleDeleteId);
    startTransition(async () => {
      const result = await deleteOrders(undefined, formData);
      if (result?.error) {
        toast(result.error, "error");
      } else if (result?.success) {
        toast("Tellimus kustutatud.", "success");
        setSingleDeleteId(null);
      }
    });
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 mb-4 px-4 py-3 bg-accent/5 border border-accent/20">
          <span className="font-bold text-sm">{selectedIds.size} tellimus(t) valitud</span>
          <div className="flex-1" />
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-1.5 border border-accent bg-white text-accent text-sm font-bold hover:bg-accent hover:text-white disabled:opacity-50"
          >
            Kustuta valitud
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Kustuta tellimused"
        message={`Oled kindel, et soovid kustutada ${selectedIds.size} tellimus(t)? Seda tegevust ei saa tagasi võtta.`}
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={handleBatchDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={singleDeleteId !== null}
        title="Kustuta tellimus"
        message="Oled kindel, et soovid selle tellimuse kustutada? Seda tegevust ei saa tagasi võtta."
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={handleSingleDelete}
        onCancel={() => setSingleDeleteId(null)}
      />

      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft">
            <tr>
              <th className="w-12 p-4">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && selectedIds.size === orders.length}
                  onChange={toggleAll}
                  className="accent-ink h-4 w-4"
                />
              </th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Number</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Klient</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Olek</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Kokku</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Aeg</th>
              <th className="w-16 p-4" />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted">
                  Ühtki tellimust ei leitud.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className={clsx(
                    "border-t border-line hover:bg-soft/50 transition-colors",
                    selectedIds.has(o.id) && "bg-leaf/5"
                  )}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      className="accent-ink h-4 w-4"
                    />
                  </td>
                  <td className="p-4 font-bold">
                    <Link href={`/haldus/tellimused/${o.id}`} className="hover:text-accent transition-colors hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="p-4">{o.customer_name}</td>
                  <td className="p-4">
                    <StatusBadge
                      variant={mapStatusToVariant(o.status) ?? "pending"}
                      label={statusLabels[o.status] ?? o.status}
                    />
                  </td>
                  <td className="p-4 font-bold">
                    {formatEuro(Number(o.total))} {o.currency}
                  </td>
                  <td className="p-4 text-xs text-muted">
                    {new Date(o.created_at).toLocaleString("et-EE")}
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setSingleDeleteId(o.id)}
                      className="text-muted hover:text-accent transition-colors"
                      title="Kustuta tellimus"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
          <p className="text-xs text-muted">
            Lehekülg {page} / {totalPages} ({totalCount} tellimust)
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="px-4 py-2 border border-line text-sm font-bold hover:bg-soft"
              >
                ← Eelmine
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pageNum = page <= 4 ? i + 1 : page + i - 3;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Link
                  key={pageNum}
                  href={buildPageHref(pageNum)}
                  className={clsx(
                    "px-4 py-2 border text-sm font-bold",
                    pageNum === page
                      ? "border-ink bg-white text-ink"
                      : "border-line hover:bg-soft"
                  )}
                >
                  {pageNum}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link
                href={buildPageHref(page + 1)}
                className="px-4 py-2 border border-line text-sm font-bold hover:bg-soft"
              >
                Järgmine →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
