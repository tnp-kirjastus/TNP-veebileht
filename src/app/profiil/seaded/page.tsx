"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

export default function ProfiilSettings() {
  return (
    <ProtectedRoute>
      <SettingsForm />
    </ProtectedRoute>
  );
}

function SettingsForm() {
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword) {
      if (newPassword.length < 6) { setError("Parool peab olema vähemalt 6 tähemärki."); return; }
      if (newPassword !== confirmPassword) { setError("Paroolid ei ühti."); return; }
    }

    setPending(true);
    try {
      const res = await fetch("/api/profiil/update-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, phone, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Salvestamine ebaõnnestus."); return; }
      setSuccess("Profiil salvestatud!");
      setNewPassword("");
      setConfirmPassword("");
      await refreshProfile();
    } catch {
      setError("Salvestamine ebaõnnestus.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-heading text-3xl mb-8">Profiil</h1>
      <form onSubmit={handleSave} className="grid gap-4">
        <label className="grid gap-2 font-bold text-sm">
          E-post
          <input
            type="email"
            value={profile?.email ?? user?.email ?? ""}
            disabled
            className="border border-line p-3 font-normal bg-soft text-muted"
          />
        </label>
        <label className="grid gap-2 font-bold text-sm">
          Nimi
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border border-line p-3 font-normal"
          />
        </label>
        <label className="grid gap-2 font-bold text-sm">
          Telefon
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-line p-3 font-normal"
          />
        </label>

        <div className="border-t border-line pt-4 mt-2">
          <h3 className="font-bold text-sm mb-3">Muuda parooli</h3>
          <div className="grid gap-4">
            <label className="grid gap-2 font-bold text-sm">
              Uus parool
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                className="border border-line p-3 font-normal"
              />
            </label>
            <label className="grid gap-2 font-bold text-sm">
              Korda uut parooli
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="border border-line p-3 font-normal"
              />
            </label>
          </div>
        </div>

        {error && <p className="text-accent font-bold text-sm">{error}</p>}
        {success && <p className="text-leaf font-bold text-sm">{success}</p>}

        <button
          type="submit"
          disabled={pending}
          className="min-h-12 border border-ink bg-white text-ink font-bold hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {pending ? "Salvestan..." : "Salvesta"}
        </button>
      </form>
    </div>
  );
}
