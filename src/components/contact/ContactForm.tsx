"use client";

import { useState } from "react";

const labels = {
  et: { name: "Nimi", email: "E-post", message: "Sõnum", send: "Saada", sending: "Saadan…", success: "Sõnum saadetud! Vastame esimesel võimalusel.", error: "Midagi läks valesti. Proovi uuesti." },
  en: { name: "Name", email: "Email", message: "Message", send: "Send", sending: "Sending…", success: "Message sent! We will respond as soon as possible.", error: "Something went wrong. Please try again." },
} as const;

export function ContactForm({ locale }: { locale: "et" | "en" }) {
  const t = labels[locale];
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setStatus("loading"); setError("");
    formData.set("locale", locale);
    try {
      const response = await fetch("/api/contact", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setError(body.error || t.error); setStatus("error"); return; }
      setStatus("success");
    } catch { setError(t.error); setStatus("error"); }
  }

  if (status === "success") return <div role="status" tabIndex={-1} className="bg-soft border border-line p-8 text-center"><p className="font-heading text-xl text-leaf">{t.success}</p></div>;
  return <form action={submit} className="grid gap-[18px]" aria-busy={status === "loading"}>
    <label className="grid gap-2 text-sm font-bold" htmlFor="contact-name">{t.name}</label><input id="contact-name" type="text" name="name" autoComplete="name" minLength={2} maxLength={120} required className="w-full border border-line bg-panel px-[14px] py-3 outline-none focus:border-ink" />
    <label className="grid gap-2 text-sm font-bold" htmlFor="contact-email">{t.email}</label><input id="contact-email" type="email" name="email" autoComplete="email" maxLength={320} required className="w-full border border-line bg-panel px-[14px] py-3 outline-none focus:border-ink" />
    <label className="grid gap-2 text-sm font-bold" htmlFor="contact-message">{t.message}</label><textarea id="contact-message" name="message" required minLength={5} maxLength={5000} rows={6} className="w-full border border-line bg-panel px-[14px] py-3 outline-none focus:border-ink resize-y min-h-[140px]" />
    {status === "error" && <p role="alert" className="text-accent text-sm font-bold">{error}</p>}
    <button type="submit" disabled={status === "loading"} className="justify-self-start min-h-[48px] px-7 border border-ink bg-ink text-white font-extrabold disabled:opacity-50">{status === "loading" ? t.sending : t.send}</button>
  </form>;
}

