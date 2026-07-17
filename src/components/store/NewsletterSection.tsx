"use client";

import { FormEvent, useState } from "react";
import { t } from "@/lib/translations";
import { Shell } from "../layout/Shell";

export function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    const response = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (response?.ok) {
      form.reset();
      setStatus("success");
      setMessage(body.message);
    } else {
      setStatus("error");
      setMessage(body?.error ?? "Liitumine ebaõnnestus. Proovi uuesti.");
    }
  }

  return (
    <section className="bg-soft border-y border-line py-12 mt-5">
      <Shell>
        <div className="grid grid-cols-[1fr_1fr] gap-[34px] items-center max-[880px]:grid-cols-1">
          <div>
            <h2 className="font-heading text-[clamp(24px,3vw,38px)] leading-[1.1]">{t.newsletter.heading}</h2>
            <p className="mt-[10px] text-muted max-w-[400px]">{t.newsletter.description}</p>
          </div>
          <div>
            <form onSubmit={submit} className="flex max-[640px]:flex-col max-[640px]:gap-2">
              <input type="email" name="email" autoComplete="email" aria-label={t.newsletter.placeholder}
                placeholder={t.newsletter.placeholder} required disabled={status === "sending"}
                className="flex-1 min-w-0 h-[50px] border border-ink border-r-0 bg-panel px-4 outline-none max-[640px]:border-r max-[640px]:border-ink" />
              <input type="hidden" name="source" value="footer" />
              <button type="submit" disabled={status === "sending"}
                className="h-[50px] px-6 border border-ink bg-white text-ink font-extrabold whitespace-nowrap hover:bg-ink hover:text-white transition-colors disabled:opacity-60">
                {status === "sending" ? "Saadan…" : t.newsletter.button}
              </button>
            </form>
            <p className="mt-2 text-xs text-muted">Liitudes nõustud uudiskirja saamisega. Kinnitamiseks saadame sulle e-kirja.</p>
            {message && <p role="status" className={`mt-2 text-sm ${status === "error" ? "text-red-700" : "text-green-800"}`}>{message}</p>}
          </div>
        </div>
      </Shell>
    </section>
  );
}
