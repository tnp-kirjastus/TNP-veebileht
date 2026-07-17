"use client";

import { useState } from "react";

interface ShipOrderDialogProps {
  onShip: (data: { carrier: string; trackingNumber: string; trackingUrl?: string }) => Promise<void>;
  onCancel: () => void;
}

const CARRIERS = [
  { value: "omniva", label: "Omniva" },
  { value: "smartpost", label: "Smartpost" },
  { value: "dpd", label: "DPD" },
  { value: "itella", label: "Itella" },
  { value: "other", label: "Muu" },
];

export function ShipOrderDialog({ onShip, onCancel }: ShipOrderDialogProps) {
  const [carrier, setCarrier] = useState("omniva");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError("Sisesta jälgimisnumber.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onShip({
        carrier,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Viga");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-panel border border-line p-8 max-w-md w-full shadow-lg"
      >
        <h2 className="font-heading text-xl mb-6">Saada tellimus teele</h2>

        <div className="grid gap-4">
          <div>
            <label className="block font-bold text-xs mb-1">Kuller</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full border border-line px-3 py-2.5 text-sm bg-paper"
            >
              {CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-xs mb-1">Jälgimisnumber *</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="nt CC123456789EE"
              className="w-full border border-line px-3 py-2.5 text-sm bg-paper font-mono"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-xs mb-1">Jälgimislink (valikuline)</label>
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-line px-3 py-2.5 text-sm bg-paper"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-accent mt-4">{error}</p>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 border border-line text-sm font-bold hover:bg-soft disabled:opacity-50"
          >
            Tühista
          </button>
          <button
            type="submit"
            disabled={loading || !trackingNumber.trim()}
            className="px-5 py-2.5 bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Saadan..." : "Kinnita saatmine"}
          </button>
        </div>
      </form>
    </div>
  );
}
