"use client";

import { useState, useCallback, useEffect } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Kinnita",
  cancelLabel = "Tühista",
  variant = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }, [onConfirm]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-ink/40" onClick={onCancel} />
      <div className="relative bg-panel border border-line p-8 max-w-md w-full shadow-lg">
        <h2 className="font-heading text-xl mb-2">{title}</h2>
        <p className="text-muted text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="px-5 py-2.5 border border-line text-sm font-bold hover:bg-soft disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy}
            className={variant === "danger"
              ? "px-5 py-2.5 border border-accent bg-white text-accent text-sm font-bold hover:bg-accent hover:text-white disabled:opacity-50"
              : "px-5 py-2.5 border border-ink bg-white text-ink text-sm font-bold hover:bg-ink hover:text-white disabled:opacity-50"}>
            {busy ? "Palun oota…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
