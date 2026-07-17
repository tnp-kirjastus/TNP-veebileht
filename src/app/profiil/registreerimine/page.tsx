"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Parool peab olema vähemalt 6 tähemärki.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Paroolid ei ühti.");
      return;
    }
    setPending(true);
    const result = await signUp(name, email, password);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/profiil");
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-heading text-3xl mb-8">Registreeri</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 font-bold text-sm">
          Nimi
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="border border-line p-3 font-normal"
          />
        </label>
        <label className="grid gap-2 font-bold text-sm">
          E-post
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="border border-line p-3 font-normal"
          />
        </label>
        <label className="grid gap-2 font-bold text-sm">
          Parool
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="border border-line p-3 font-normal"
          />
        </label>
        <label className="grid gap-2 font-bold text-sm">
          Korda parooli
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="border border-line p-3 font-normal"
          />
        </label>
        {error && <p className="text-accent font-bold text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {pending ? "Registreerin..." : "Registreeri"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        Juba konto olemas?{" "}
        <Link href="/profiil/sisselogimine" className="text-accent font-bold hover:underline">
          Logi sisse
        </Link>
      </p>
    </div>
  );
}
