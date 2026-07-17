"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  function closeDrawer() {
    setError("");
    setPending(false);
    setSuccessMessage("");
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    onClose();
  }

  function switchTab(t: "login" | "register") {
    setError("");
    setTab(t);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const result = await signIn(email, password);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      closeDrawer();
    }
  }

  async function handleRegister(e: React.FormEvent) {
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
      setSuccessMessage("Registreerimine õnnestus. Palun kontrollige oma e-maili ja kinnitage aadress.");
    }
  }

  if (user) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-[rgba(21,23,24,.42)] transition-opacity duration-[250ms] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeDrawer}
        aria-hidden={!open}
      />

      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 bottom-0 z-40 w-[min(520px,100vw)] bg-panel border-l border-ink grid grid-rows-[auto_1fr_auto] transition-transform duration-[320ms] ${open ? "translate-x-0" : "translate-x-[104%]"}`}
      >
        <div className="p-[22px] border-b border-line flex items-center justify-between gap-[18px]">
          <h2 className="text-[26px] font-heading">{tab === "login" ? "Logi sisse" : "Registreeri"}</h2>
          <button className="w-[44px] h-[44px] border border-line bg-panel grid place-items-center hover:bg-soft" onClick={closeDrawer} aria-label="Sulge">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>

        <div className="overflow-auto p-[18px_22px]">
          {successMessage ? (
            <div className="py-10 text-center">
              <p className="text-leaf font-bold text-base">{successMessage}</p>
            </div>
          ) : (
          <>
          <div className="flex gap-0 mb-8 border-b border-line">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 font-bold text-sm border-b-2 transition-colors ${tab === "login" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              Logi sisse
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`flex-1 py-2 font-bold text-sm border-b-2 transition-colors ${tab === "register" ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              Registreeri
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="grid gap-4">
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
              <p className="text-sm text-muted text-center">
                Pole veel kontot?{" "}
                <button type="button" onClick={() => switchTab("register")} className="text-accent font-bold hover:underline">
                  Registreeri
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="grid gap-4">
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
              <p className="text-sm text-muted text-center">
                Juba konto olemas?{" "}
                <button type="button" onClick={() => switchTab("login")} className="text-accent font-bold hover:underline">
                  Logi sisse
                </button>
              </p>
            </form>
          )}
          </>
          )}
        </div>
      </aside>
    </>
  );
}
