"use client";

import { useState, useActionState, useRef } from "react";
import { FormField } from "@/components/admin/FormField";
import { saveStoreSettings } from "@/app/haldus/settings-actions";
import type { StoreSettings } from "@/app/haldus/settings-actions";

type Tab = "shipping" | "email" | "vat" | "company" | "social" | "theme";

const TABS: { key: Tab; label: string }[] = [
  { key: "shipping", label: "Tarne" },
  { key: "email", label: "E-kirjad" },
  { key: "vat", label: "Käibemaks" },
  { key: "company", label: "Poe info" },
  { key: "social", label: "Sotsiaalmeedia" },
  { key: "theme", label: "Kujundus" },
];

const STATUS_KEYS = [
  { key: "pending", label: "Ootel" },
  { key: "payment_pending", label: "Makse ootel" },
  { key: "paid", label: "Makstud" },
  { key: "processing", label: "Töötlemisel" },
  { key: "shipped", label: "Saadetud" },
  { key: "delivered", label: "Kohale toimetatud" },
  { key: "cancelled", label: "Tühistatud" },
  { key: "payment_failed", label: "Makse ebaõnnestus" },
  { key: "expired", label: "Aegunud" },
  { key: "manual_review", label: "Käsitsi ülevaatus" },
  { key: "refunded", label: "Tagastatud" },
  { key: "preorder", label: "Ettetellimus" },
];

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [tab, setTab] = useState<Tab>("shipping");
  const [local, setLocal] = useState(settings);
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function updateShipping(rateIndex: number, field: string, value: string) {
    setLocal((prev) => {
      const rates = [...prev.shipping.rates];
      rates[rateIndex] = {
        ...rates[rateIndex],
        [field]: field === "price" || field === "freeFrom" ? Number(value) || 0 : value,
      };
      return { ...prev, shipping: { ...prev.shipping, rates } };
    });
  }

  function updateShippingApi(field: string, value: string) {
    setLocal((prev) => ({
      ...prev,
      shipping: { ...prev.shipping, api: { ...prev.shipping.api, [field]: value } },
    }));
  }

  function updateEmail(field: string, value: string) {
    setLocal((prev) => ({ ...prev, email: { ...prev.email, [field]: value } }));
  }

  function updateStatusTemplate(statusKey: string, field: string, value: string) {
    setLocal((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        statusTemplates: {
          ...(prev.email.statusTemplates ?? {}),
          [statusKey]: {
            ...(prev.email.statusTemplates?.[statusKey] ?? { subject: "", heading: "", bodyHtml: "" }),
            [field]: value,
          },
        },
      },
    }));
  }

  function toggleNotification(statusKey: string) {
    setLocal((prev) => ({
      ...prev,
      email: {
        ...prev.email,
        notifications: {
          ...(prev.email.notifications ?? {}),
          [`notify_${statusKey}`]: !(prev.email.notifications?.[`notify_${statusKey}`] ?? true),
        },
      },
    }));
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

      {/* ===== SHIPPING TAB ===== */}
      {tab === "shipping" && (
        <div className="space-y-8 max-w-2xl">
          <div className="grid gap-6">
            <h3 className="font-heading text-lg">Tarnehinnad</h3>
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
                <FormField label="Kuvatav nimi" required>
                  <input
                    type="text"
                    value={rate.label_et}
                    onChange={(e) => updateShipping(i, "label_et", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Carrier ID (API)">
                    <input
                      type="text"
                      value={rate.carrier}
                      onChange={(e) => updateShipping(i, "carrier", e.target.value)}
                      className="w-full border border-line px-3 py-2 text-sm bg-paper"
                    />
                  </FormField>
                  <FormField label="Meetod (API)">
                    <input
                      type="text"
                      value={rate.method}
                      onChange={(e) => updateShipping(i, "method", e.target.value)}
                      className="w-full border border-line px-3 py-2 text-sm bg-paper"
                    />
                  </FormField>
                </div>
              </fieldset>
            ))}
          </div>

          <div className="grid gap-6">
            <h3 className="font-heading text-lg">Maksekeskus API seaded</h3>
            <p className="text-xs text-muted -mt-2">
              API võtmed (MAKSEKESKUS_SHOP_ID, MAKSEKESKUS_SECRET) on määratud Vercel keskkonnamuutujates.
            </p>
            <fieldset className="border border-line p-4 grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Live API URL" required>
                  <input
                    type="text"
                    value={local.shipping.api.maksekeskusLiveUrl}
                    onChange={(e) => updateShippingApi("maksekeskusLiveUrl", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
                <FormField label="Test API URL" required>
                  <input
                    type="text"
                    value={local.shipping.api.maksekeskusTestUrl}
                    onChange={(e) => updateShippingApi("maksekeskusTestUrl", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Pakiautomaadi tüüpide filter" required>
                  <input
                    type="text"
                    value={local.shipping.api.parcelMachineType}
                    onChange={(e) => updateShippingApi("parcelMachineType", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
                <FormField label="Riigi filter" required>
                  <input
                    type="text"
                    value={local.shipping.api.parcelMachineCountryFilter}
                    onChange={(e) => updateShippingApi("parcelMachineCountryFilter", e.target.value)}
                    className="w-full border border-line px-3 py-2 text-sm bg-paper"
                  />
                </FormField>
              </div>
            </fieldset>
          </div>
        </div>
      )}

      {/* ===== EMAIL TAB ===== */}
      {tab === "email" && (
        <div className="space-y-8 max-w-3xl">
          {/* General email settings */}
          <div className="grid gap-4">
            <h3 className="font-heading text-lg">Üldised e-kirja seaded</h3>
            <FormField label="Saatja aadress" required>
              <input
                type="text"
                value={local.email.fromAddress}
                onChange={(e) => updateEmail("fromAddress", e.target.value)}
                className="w-full border border-line px-3 py-2 text-sm bg-paper"
                placeholder="tellimused@tnp.ee"
              />
            </FormField>
            <FormField label="Kontakti e-posti aadress" required>
              <input
                type="text"
                value={local.email.contactEmail}
                onChange={(e) => updateEmail("contactEmail", e.target.value)}
                className="w-full border border-line px-3 py-2 text-sm bg-paper"
                placeholder="tellimused@tnp.ee"
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
            <FormField label="Tellimuse kinnituse sisu (plain text)" required>
              <textarea
                rows={10}
                value={local.email.orderBody}
                onChange={(e) => updateEmail("orderBody", e.target.value)}
                className="w-full border border-line px-3 py-2 text-sm bg-paper font-mono"
              />
            </FormField>
          </div>

          {/* Status-specific templates */}
          <div className="grid gap-4">
            <h3 className="font-heading text-lg">Staatuse teavituste mallid</h3>
            <p className="text-xs text-muted -mt-2">
              Muutujad: {"{{orderNumber}}"}, {"{{customerName}}"}, {"{{statusLabel}}"}. Kliki staatusel, et muuta selle e-kirja malli.
            </p>

            {STATUS_KEYS.map(({ key, label }) => {
              const tpl = local.email.statusTemplates?.[key] ?? { subject: "", heading: "", bodyHtml: "" };
              const notifyKey = `notify_${key}`;
              const isEnabled = local.email.notifications?.[notifyKey] !== false;
              const isExpanded = expandedStatus === key;

              return (
                <div key={key} className="border border-line">
                  <button
                    type="button"
                    onClick={() => setExpandedStatus(isExpanded ? null : key)}
                    className="w-full flex items-center justify-between p-4 hover:bg-soft/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="font-bold text-sm">{label}</span>
                    </div>
                    <label
                      className="flex items-center gap-2 text-xs cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); toggleNotification(key); }}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleNotification(key)}
                        className="accent-ink h-3.5 w-3.5"
                      />
                      <span className={isEnabled ? "text-leaf" : "text-muted"}>
                        {isEnabled ? "Saadetakse" : "Ei saadeta"}
                      </span>
                    </label>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t border-line bg-soft/20 space-y-4">
                      <FormField label="Teema" required>
                        <input
                          type="text"
                          value={tpl.subject}
                          onChange={(e) => updateStatusTemplate(key, "subject", e.target.value)}
                          className="w-full border border-line px-3 py-2 text-sm bg-paper"
                        />
                      </FormField>
                      <FormField label="Pealkiri" required>
                        <input
                          type="text"
                          value={tpl.heading}
                          onChange={(e) => updateStatusTemplate(key, "heading", e.target.value)}
                          className="w-full border border-line px-3 py-2 text-sm bg-paper"
                        />
                      </FormField>
                      <FormField label="Sisu (HTML)" required>
                        <textarea
                          rows={6}
                          value={tpl.bodyHtml}
                          onChange={(e) => updateStatusTemplate(key, "bodyHtml", e.target.value)}
                          className="w-full border border-line px-3 py-2 text-sm bg-paper font-mono"
                        />
                      </FormField>
                      <div className="text-xs text-muted">
                        Mustache tingimus: {"{{#customerName}}...{{/customerName}}"} — kuvatakse ainult kui kliendi nimi on olemas.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
