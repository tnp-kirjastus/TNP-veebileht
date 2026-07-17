"use client";

import { FormEvent, useState } from "react";

export function AvailabilityModal({ productTitle, onClose }: {
  productTitle: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/availability-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), productTitle }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Päringu saatmine ebaõnnestus");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Midagi läks valesti");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.42)]" onClick={onClose}>
      <div className="bg-white p-8 max-w-[440px] w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-muted hover:text-ink text-xl leading-none">&times;</button>

        {sent ? (
          <div className="text-center py-4">
            <h3 className="font-heading text-xl mb-3">Päring saadetud!</h3>
            <p className="text-muted">
              Saadame teile teavituse, kui &quot;{productTitle}&quot; on taas saadaval.
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-heading text-xl mb-1">Küsi saadavust</h3>
            <p className="text-sm text-muted mb-5">
              {productTitle}
            </p>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-2 font-bold text-sm">
                Teie e-posti aadress
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="nimi@naide.ee"
                  className="border border-line p-3 font-normal"
                />
              </label>
              {error && <p className="text-accent text-sm">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="min-h-[46px] border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50"
              >
                {sending ? "Saadan..." : "Saada päring"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
