"use client";

import { useState, useActionState, useRef } from "react";
import { FormField } from "@/components/admin/FormField";
import { saveStoreSettings } from "@/app/haldus/settings-actions";
import type { StoreSettings } from "@/app/haldus/settings-actions";

type Tab = "shipping" | "email" | "notifications" | "vat" | "company" | "social" | "theme";

const TABS: { key: Tab; label: string }[] = [
  { key: "shipping", label: "Tarne" },
  { key: "email", label: "E-kirjad" },
  { key: "notifications", label: "Teavitused" },
  { key: "vat", label: "Käibemaks" },
  { key: "company", label: "Poe info" },
  { key: "social", label: "Sotsiaalmeedia" },
  { key: "theme", label: "Kujundus" },
];

const NOTIFICATION_KEYS = [
  { key: "notify_pending", label: "Ootel (tellimus vastu võetud)" },
  { key: "notify_payment_pending", label: "Makse ootel" },
  { key: "notify_paid", label: "Makstud" },
  { key: "notify_processing", label: "Töötlemisel" },
  { key: "notify_shipped", label: "Saadetud" },
  { key: "notify_delivered", label: "Kohale toimetatud" },
  { key: "notify_cancelled", label: "Tühistatud" },
  { key: "notify_payment_failed", label: "Makse ebaõnnestus" },
  { key: "notify_expired", label: "Aegunud" },
  { key: "notify_manual_review", label: "Käsitsi ülevaatus" },
  { key: "notify_refunded", label: "Tagastatud" },
  { key: "notify_preorder", label: "Ettetellimus" },
];

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [tab, setTab] = useState<Tab>("shipping");
  const [local, setLocal] = useState(settings);
  const formRef = useRef<HTMLFormElement>(null);

  function updateShipping(rateIndex: number, field: string, value: string) {
    setLocal((prev) => {
      const rates = [...prev.shipping.rates];
      rates[rateIndex] = {
        ...rates[rateIndex],
        [field]: field === "price" || field === "freeFrom" ? Number(value) || 0 : value,
      };
      return { ...prev, shipping: { rates } };
    });
  }

  function updateEmail(field: string, value: string) {
    setLocal((prev) => ({ ...prev, email: { ...prev.email, [field]: value } }));
  }

  function updateVat(value: string) {
    setLocal((prev) => ({ ...prev, vat: { percent: Number(value) || 0 } }));
  }

  function updateCompany(field: string, value: string) {
    setLocal((prev) => ({ ...prev, company: { ...prev.company, [field]: value } }));
  }

  function updateSocial(field: string, value: string) {
    setLocal((prev) => ({ ...prev, social: { ...prev.social, [field]: value } }));
  }

  function updateTheme(field: string, value: string) {
    setLocal((prev) => ({ ...prev, theme: { ...prev.theme, [field]: value } }));
  }

  function toggleNotification(key: string) {
    setLocal((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        notifications: {
          ...(prev.email.notifications ?? {}),
          [key]: !(prev.email.notifications?.[key] ?? true),
        },
      },
    }));
  }

  const [state, action, pending] = useActionState(saveStoreSettings, undefined);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="settings" value={JSON.stringify(local)} readOnly />

      <div className="flex gap-0 mb-6 border-b border-line">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              tab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "shipping" && (
        <div className="grid gap-6 max-w-2xl">
          {local.shipping.rates.map((rate, i) => (
            <fieldset key={rate.carrier} className="border border-line p-4 grid gap-4">
              <legend className="font-heading text-lg px-2">{rate.label_et}</legend>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Hind (€)" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate.price}
                    onChange={(e) => updateShipping(i, "price", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
                <FormField label="Tasuta alates (€)" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate.freeFrom}
                    onChange={(e) => updateShipping(i, "freeFrom", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
              </div>
              <FormField label="Silt" required>
                <input
                  type="text"
                  value={rate.label_et}
                  onChange={(e) => updateShipping(i, "label_et", e.target.value)}
                  className="w-full border border-line px-3 py-2 text-sm bg-paper"
                />
              </FormField>
            </fieldset>
          ))}
        </div>
      )}

      {tab === "email" && (
        <div className="grid gap-4 max-w-2xl">
          <FormField label="Saatja aadress" required>
            <input
              type="text"
              value={local.email.fromAddress}
              onChange={(e) => updateEmail("fromAddress", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
              placeholder="Kirjastus Tänapäev <tellimused@tnp.ee>"
            />
          </FormField>
          <FormField label="Tellimuse kinnituse teema" required>
            <input
              type="text"
              value={local.email.orderSubject}
              onChange={(e) => updateEmail("orderSubject", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
          <div className="text-xs text-muted mb-1">
            Muutujad: {"{{customerName}}"}, {"{{orderNumber}}"}, {"{{total}}"}, {"{{itemLines}}"}
          </div>
          <FormField label="Tellimuse kinnituse sisu" required>
            <textarea
              rows={10}
              value={local.email.orderBody}
              onChange={(e) => updateEmail("orderBody", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper font-mono"
            />
          </FormField>
        </div>
      )}

      {tab === "notifications" && (
        <div className="grid gap-3 max-w-lg">
          <p className="text-sm text-muted mb-2">
            Vali, milliste tellimuse staatuse muutuste korral saadetakse kliendile automaatne e-kiri.
          </p>
          {NOTIFICATION_KEYS.map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 p-3 border border-line cursor-pointer hover:bg-soft/30 transition-colors"
            >
              <input
                type="checkbox"
                checked={local.email.notifications?.[key] !== false}
                onChange={() => toggleNotification(key)}
                className="accent-ink h-4 w-4 flex-shrink-0"
              />
              <span className="text-sm font-bold">{label}</span>
            </label>
          ))}
        </div>
      )}

      {tab === "vat" && (
        <div className="grid gap-4 max-w-xs">
          <FormField label="Käibemaksu protsent" required>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={local.vat.percent}
              onChange={(e) => updateVat(e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
        </div>
      )}

      {tab === "company" && (
        <div className="grid gap-4 max-w-2xl">
          <FormField label="Ettevõtte nimi">
            <input
              type="text"
              value={local.company.name}
              onChange={(e) => updateCompany("name", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
          <FormField label="E-posti aadress">
            <input
              type="email"
              value={local.company.email}
              onChange={(e) => updateCompany("email", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
          <FormField label="Telefon">
            <input
              type="text"
              value={local.company.phone}
              onChange={(e) => updateCompany("phone", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
          <FormField label="Aadress">
            <input
              type="text"
              value={local.company.address}
              onChange={(e) => updateCompany("address", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
          <FormField label="Registrikood">
            <input
              type="text"
              value={local.company.regCode}
              onChange={(e) => updateCompany("regCode", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
            />
          </FormField>
        </div>
      )}

      {tab === "social" && (
        <div className="grid gap-4 max-w-2xl">
          <FormField label="Facebook URL">
            <input
              type="url"
              value={local.social.facebook}
              onChange={(e) => updateSocial("facebook", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
              placeholder="https://facebook.com/..."
            />
          </FormField>
          <FormField label="Instagram URL">
            <input
              type="url"
              value={local.social.instagram}
              onChange={(e) => updateSocial("instagram", e.target.value)}
              className="w-full border border-line px-3 py-2 text-sm bg-paper"
              placeholder="https://instagram.com/..."
            />
          </FormField>
        </div>
      )}

      {tab === "theme" && (
        <div className="grid gap-6 max-w-md">
          <FormField label="Aktsentvärv" required>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-line" style={{ backgroundColor: local.theme.accentColor }} />
              <input
                type="text"
                value={local.theme.accentColor}
                onChange={(e) => updateTheme("accentColor", e.target.value)}
                className="flex-1 border border-line px-3 py-2 text-sm bg-paper"
                placeholder="#4a1aa1"
              />
              <input
                type="color"
                value={local.theme.accentColor}
                onChange={(e) => updateTheme("accentColor", e.target.value)}
                className="w-10 h-10 border border-line cursor-pointer p-0"
              />
            </div>
          </FormField>
          <FormField label="Aktsentvärv (tume)" required>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-line" style={{ backgroundColor: local.theme.accentColorDark }} />
              <input
                type="text"
                value={local.theme.accentColorDark}
                onChange={(e) => updateTheme("accentColorDark", e.target.value)}
                className="flex-1 border border-line px-3 py-2 text-sm bg-paper"
                placeholder="#31106c"
              />
              <input
                type="color"
                value={local.theme.accentColorDark}
                onChange={(e) => updateTheme("accentColorDark", e.target.value)}
                className="w-10 h-10 border border-line cursor-pointer p-0"
              />
            </div>
          </FormField>
        </div>
      )}

      {state?.error && (
        <p className="text-sm text-accent mt-4">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-leaf mt-4">Seaded salvestatud!</p>
      )}

      <div className="mt-8">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 border border-ink bg-white text-ink font-bold text-sm hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {pending ? "Salvestan..." : "Salvesta seaded"}
        </button>
      </div>
    </form>
  );
}
