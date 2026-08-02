"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("Parool peab olema vähemalt 6 tähemärki.");
    if (password !== confirm) return setError("Paroolid ei ühti.");
    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (updateError) setError("Parooli muutmine ebaõnnestus. Ava taastamise link uuesti.");
    else {
      setDone(true);
      router.replace("/profiil/sisselogimine");
    }
  }

  if (done) return <p className="text-muted">Parool on muudetud.</p>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-heading text-3xl mb-8">Määra uus parool</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 font-bold text-sm">Uus parool<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required className="border border-line p-3 font-normal" /></label>
        <label className="grid gap-2 font-bold text-sm">Korda parooli<input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={6} required className="border border-line p-3 font-normal" /></label>
        {error && <p role="alert" className="text-accent font-bold text-sm">{error}</p>}
        <button type="submit" disabled={pending} className="min-h-12 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">{pending ? "Salvestan..." : "Salvesta uus parool"}</button>
      </form>
      <Link href="/profiil/sisselogimine" className="text-accent font-bold hover:underline mt-6 inline-block">Tagasi sisselogimise juurde</Link>
    </div>
  );
}
