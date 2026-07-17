"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const result = await signIn(email, password);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/profiil");
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-heading text-3xl mb-8">Logi sisse</h1>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2 font-bold text-sm">
          E-post
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
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
          {pending ? "Sisse logimas..." : "Logi sisse"}
        </button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">
        Pole veel kontot?{" "}
        <Link href="/profiil/registreerimine" className="text-accent font-bold hover:underline">
          Registreeri
        </Link>
      </p>
    </div>
  );
}
