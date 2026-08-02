"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function PasswordResetRequestPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await requestPasswordReset(email);
    setPending(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-heading text-3xl mb-4">Taasta parool</h1>
      {sent ? (
        <>
          <p className="text-muted">Kui selle aadressiga konto on olemas, saatsime sinna parooli taastamise juhised.</p>
          <Link href="/profiil/sisselogimine" className="text-accent font-bold hover:underline mt-6 inline-block">Tagasi sisselogimise juurde</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4">
          <p className="text-muted">Sisesta oma e-posti aadress ja saadame sulle taastamise lingi.</p>
          <label className="grid gap-2 font-bold text-sm">
            E-post
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="border border-line p-3 font-normal" />
          </label>
          {error && <p role="alert" className="text-accent font-bold text-sm">{error}</p>}
          <button type="submit" disabled={pending} className="min-h-12 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">
            {pending ? "Saadan..." : "Saada taastamise link"}
          </button>
        </form>
      )}
    </div>
  );
}
