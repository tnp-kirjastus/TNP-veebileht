"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="grid gap-5 mt-8">
      <div><label htmlFor="email" className="block text-sm font-bold mb-2">E-post</label><input id="email" name="email" type="email" autoComplete="username" required className="w-full border border-line p-3 bg-panel" /></div>
      <div><label htmlFor="password" className="block text-sm font-bold mb-2">Parool</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full border border-line p-3 bg-panel" /></div>
      {state?.error && <p role="alert" className="text-accent text-sm">{state.error}</p>}
      <button disabled={pending} className="min-h-12 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50">{pending ? "Sisenen…" : "Logi sisse"}</button>
    </form>
  );
}

