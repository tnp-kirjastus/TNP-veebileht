"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/browser";
import {
  SHIPPING_RATES,
  calculateShippingCost,
  type ShippingRate,
} from "@/lib/shipping/config";
import type {
  GroupedMachines,
  ParcelMachine,
} from "@/lib/shipping/maksekeskus-shipping";

type ShippingCarrier = "omniva" | "smartpost";

type CheckoutData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  shipping_method: ShippingCarrier;
  address: string;
  invoiceRequested: boolean;
  companyName: string;
  companyRegCode: string;
};

const initialData: CheckoutData = {
  firstName: "", lastName: "", email: "", phone: "",
  shipping_method: "omniva", address: "",
  invoiceRequested: false,
  companyName: "",
  companyRegCode: "",
};

function shippingRate(carrier: ShippingCarrier): ShippingRate | undefined {
  return SHIPPING_RATES.find((r) => r.carrier === carrier);
}

function shippingLabel(carrier: ShippingCarrier): string {
  return shippingRate(carrier)?.label_et ?? carrier;
}

export function CheckoutForm({ compact = false }: { compact?: boolean }) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState(initialData);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [machines, setMachines] = useState<Record<string, GroupedMachines[]> | null>(null);
  const [machinesError, setMachinesError] = useState(false);
  const [machineSearch, setMachineSearch] = useState("");
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<ParcelMachine | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadMachines = useCallback(() => {
    let cancelled = false;
    setMachinesError(false);
    fetch("/api/shipping/parcel-machines")
      .then((r) => r.json())
      .then((data: Record<string, GroupedMachines[]>) => {
        if (!cancelled) {
          setMachines(data);
          setMachinesError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMachinesError(true);
          setMachines({});
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState calls are inside async fetch callbacks
    return loadMachines();
  }, [loadMachines]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMachineDropdownOpen(false);
        setMachineSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function update<K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) {
    setData((current) => {
      const next = { ...current, [key]: value };
      if (key === "shipping_method" && value !== current.shipping_method) {
        const prevMachine = selectedMachine;
        setSelectedMachine(null);
        setMachineSearch("");
        if (prevMachine) {
          next.address = "";
        }
      }
      return next;
    });
  }

  const selectMachine = useCallback(
    (machine: ParcelMachine) => {
      setSelectedMachine(machine);
      setMachineSearch("");
      setMachineDropdownOpen(false);
      setData((prev) => ({
        ...prev,
        address: `${machine.carrier}||${machine.id}`,
      }));
    },
    []
  );

  const currentCarrierMachines: GroupedMachines[] = useMemo(() => {
    if (!machines) return [];
    return machines[data.shipping_method] ?? [];
  }, [machines, data.shipping_method]);

  const filteredMachines: GroupedMachines[] = useMemo(() => {
    if (!machineSearch.trim()) return currentCarrierMachines;
    const q = machineSearch.toLowerCase();
    return currentCarrierMachines
      .map((g) => {
        const filtered = g.machines.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q) ||
            m.address.toLowerCase().includes(q)
        );
        return filtered.length > 0 ? { city: g.city, machines: filtered } : null;
      })
      .filter((g): g is GroupedMachines => g !== null);
  }, [currentCarrierMachines, machineSearch]);

  const shippingCost = calculateShippingCost(data.shipping_method, total);
  const orderTotal = total + shippingCost - couponDiscount;
  const needsMore = shippingCost > 0
    ? shippingRate(data.shipping_method)!.freeFrom - total
    : 0;

  const KM_PERCENT = 9;
  const vatAmount = orderTotal - (orderTotal / (1 + KM_PERCENT / 100));

  const isParcelMachine = data.shipping_method === "omniva" || data.shipping_method === "smartpost";

  async function applyCoupon() {
    setCouponBusy(true);
    setCouponError("");
    setCouponSuccess(false);
    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: total }),
      });
      const result = await response.json();
      if (!response.ok) {
        setCouponError(result.error || "Sooduskood ei kehti.");
        setCouponDiscount(0);
        return;
      }
      setCouponDiscount(result.discount);
      setCouponSuccess(true);
    } catch {
      setCouponError("Sooduskoodi kontroll ebaõnnestus.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < 3) {
      if (step === 2 && isParcelMachine && !selectedMachine) {
        setError("Palun vali pakiautomaat.");
        return;
      }
      setStep((step + 1) as 2 | 3);
      setError("");
      return;
    }

    if (!accepted) {
      setError("Tellimuse jätkamiseks nõustu müügi- ja privaatsustingimustega.");
      return;
    }

      const errors: Record<string, string> = {};
    if (createAccount) {
      if (!password || password.length < 6) errors.password = "Parool peab olema vähemalt 6 tähemärki.";
      if (password !== confirmPassword) errors.confirmPassword = "Paroolid ei ühti.";
    }
    if (Object.keys(errors).length > 0) {
      setError(errors.password ?? errors.confirmPassword ?? "Kontrolli parooli.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${data.firstName.trim()} ${data.lastName.trim()}`,
          email: data.email,
          phone: data.phone,
          shipping_method: data.shipping_method,
          address: data.address,
          invoiceRequested: data.invoiceRequested,
          companyName: data.companyName,
          companyRegCode: data.companyRegCode,
          idempotencyKey,
          items: items.map(({ slug, quantity }) => ({ slug, quantity })),
          shipping_cost: shippingCost,
          couponCode: couponCode.trim() || undefined,
          couponDiscount,
          create_account: createAccount,
          password: createAccount ? password : undefined,
          parcel_machine: selectedMachine
            ? {
                carrier: selectedMachine.carrier,
                id: selectedMachine.id,
                name: selectedMachine.name,
                city: selectedMachine.city,
                address: selectedMachine.address,
                zip: selectedMachine.zip,
              }
            : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Tellimuse loomine ebaõnnestus.");
        setPending(false);
        return;
      }
      if (
        typeof result.redirectUrl !== "string" ||
        (!result.redirectUrl.startsWith("https://") && !result.redirectUrl.startsWith("/"))
      ) {
        throw new Error("invalid_payment_redirect");
      }
      clearCart();
      if (result.created_account && createAccount && password) {
        try {
          const sb = createClient();
          const { error: signInErr } = await sb.auth.signInWithPassword({ email: data.email, password });
          if (signInErr) {
            console.warn("[checkout] auto sign-in after account creation failed:", signInErr.message);
          }
        } catch { /* ignore */ }
      }
      window.location.assign(result.redirectUrl);
    } catch {
      setError("Makse algatamine ebaõnnestus. Proovi uuesti.");
      setPending(false);
    }
  }

  return (
    <div className={compact ? "" : "grid grid-cols-[minmax(0,1fr)_320px] gap-10 max-[900px]:grid-cols-1"}>
      <div>
        <ol className="grid grid-cols-3 mb-8 border border-line" aria-label="Tellimuse sammud">
          {["Kontakt", "Tarne", "Kinnitus"].map((label, index) => {
            const number = index + 1;
            return (
              <li
                key={label}
                aria-current={step === number ? "step" : undefined}
                className={`min-h-12 px-3 grid place-items-center text-center text-sm font-extrabold border-r last:border-0 border-line ${
                  step === number ? "border-2 border-ink bg-white text-ink" : number < step ? "bg-soft text-ink" : "text-muted"
                }`}
              >
                {number}. {label}
              </li>
            );
          })}
        </ol>

        <form onSubmit={submit} className="grid gap-5" aria-busy={pending}>
          {/* Step 1: Contact */}
          {step === 1 && (
            <fieldset className="grid gap-5">
              <legend className="font-heading text-2xl mb-5">Kontaktandmed</legend>
              <div className={`grid gap-5 ${compact ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1"}`}>
                <label className="grid gap-2 font-bold text-sm">
                  Eesnimi
                  <input
                    value={data.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    autoComplete="given-name"
                    autoFocus
                    required
                    minLength={1}
                    className="border border-line p-3 font-normal"
                  />
                </label>
                <label className="grid gap-2 font-bold text-sm">
                  Perekonnanimi
                  <input
                    value={data.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    autoComplete="family-name"
                    required
                    minLength={1}
                    className="border border-line p-3 font-normal"
                  />
                </label>
              </div>
              <label className="grid gap-2 font-bold text-sm">
                  E-post
                  <input
                    value={data.email}
                    onChange={(e) => update("email", e.target.value)}
                    type="email"
                    autoComplete="email"
                    required
                    className="border border-line p-3 font-normal"
                  />
                </label>
              <label className="grid gap-2 font-bold text-sm">
                Telefon
                <input
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  type="tel"
                  autoComplete="tel"
                  required
                  minLength={5}
                  className="border border-line p-3 font-normal"
                />
              </label>

              <div className="border-t border-line pt-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.invoiceRequested}
                    onChange={(e) => update("invoiceRequested", e.target.checked)}
                    className="accent-ink h-4 w-4"
                  />
                  <span className="font-bold text-sm">Soovin arvet firmale</span>
                </label>

                {data.invoiceRequested && (
                  <div className={`grid gap-4 mt-4 pl-6 ${compact ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1"}`}>
                    <label className="grid gap-2 font-bold text-sm">
                      Ettevõtte nimi
                      <input
                        value={data.companyName}
                        onChange={(e) => update("companyName", e.target.value)}
                        required={data.invoiceRequested}
                        className="border border-line p-3 font-normal"
                      />
                    </label>
                    <label className="grid gap-2 font-bold text-sm">
                      Registrikood
                      <input
                        value={data.companyRegCode}
                        onChange={(e) => update("companyRegCode", e.target.value)}
                        required={data.invoiceRequested}
                        className="border border-line p-3 font-normal"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="border-t border-line pt-4 mt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-ink"
                  />
                  <div>
                    <span className="font-bold text-sm">Loo konto</span>
                    <p className="text-sm text-muted mt-0.5">
                      Loo endale konto, et näha oma tellimusi ja kiiremini
                      järgmisi oste sooritada.
                    </p>
                  </div>
                </label>

                {createAccount && (
                  <div className={`grid gap-4 mt-4 pl-7 ${compact ? "grid-cols-1" : "grid-cols-2 max-sm:grid-cols-1"}`}>
                    <label className="grid gap-2 font-bold text-sm">
                      Parool
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
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
                        className="border border-line p-3 font-normal"
                      />
                    </label>
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* Coupon code - visible in steps 1 and 2 */}
          {(step === 1 || step === 2) && (
            <div className="border-t border-line pt-4 mt-0">
              <label className="grid gap-2 font-bold text-sm">
                Sooduskood
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (couponSuccess) {
                        setCouponSuccess(false);
                        setCouponDiscount(0);
                      }
                    }}
                    placeholder="Sisesta sooduskood"
                    className="border border-line p-3 font-normal"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={!couponCode.trim() || couponBusy}
                    className="min-h-[46px] px-4 border border-ink font-bold bg-white text-ink hover:bg-ink hover:text-white disabled:opacity-50"
                  >
                    {couponBusy ? "..." : "Rakenda"}
                  </button>
                </div>
              </label>
              {couponError && <p className="text-accent text-sm mt-1">{couponError}</p>}
              {couponSuccess && <p className="text-leaf text-sm mt-1">Sooduskood rakendatud! &minus;{couponDiscount.toFixed(2)} €</p>}
            </div>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <fieldset className="grid gap-5">
              <legend className="font-heading text-2xl mb-5">Tarneviis</legend>

              {(["omniva", "smartpost"] as const).map((carrier) => {
                const rate = shippingRate(carrier);
                const cost = rate ? calculateShippingCost(carrier, total) : 0;
                return (
                  <label
                    key={carrier}
                    className={`border p-4 cursor-pointer ${
                      data.shipping_method === carrier ? "border-ink bg-soft" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping_method"
                      value={carrier}
                      checked={data.shipping_method === carrier}
                      onChange={() => update("shipping_method", carrier)}
                      className="mr-2"
                    />
                    <strong>{shippingLabel(carrier)}</strong>
                    <span className="block text-sm text-muted mt-1">
                      {rate
                        ? `Tarne ${rate.price.toFixed(2)} € pakiautomaati.`
                        : ""}
                      {cost === 0 && rate && (
                        <span className="text-leaf font-bold ml-1">Tasuta</span>
                      )}
                    </span>
                  </label>
                );
              })}

              {isParcelMachine && (
                <div ref={dropdownRef} className="relative">
                  <label className="grid gap-2 font-bold text-sm">
                    {data.shipping_method === "omniva"
                      ? "Omniva pakiautomaat"
                      : "Smartpost pakiautomaat"}
                    <input
                      ref={searchInputRef}
                      type="text"
                      role="combobox"
                      aria-expanded={machineDropdownOpen}
                      aria-controls="parcel-machine-listbox"
                      aria-haspopup="listbox"
                      value={
                        selectedMachine
                          ? `${selectedMachine.name} — ${selectedMachine.city}, ${selectedMachine.address}`
                          : machineDropdownOpen
                            ? machineSearch
                            : ""
                      }
                      placeholder={
                        machines === null
                          ? "Pakiautomaatide laadimine..."
                          : selectedMachine
                            ? ""
                            : "Klõpsa ja otsi pakiautomaati..."
                      }
                      onFocus={() => {
                        setMachineDropdownOpen(true);
                      }}
                      onChange={(e) => {
                        setMachineSearch(e.target.value);
                        if (!machineDropdownOpen) setMachineDropdownOpen(true);
                      }}
                      onClick={() => {
                        setMachineDropdownOpen(true);
                      }}
                      className="border border-line p-3 font-normal cursor-pointer"
                    />
                  </label>

                  {machineDropdownOpen && (
                    <div id="parcel-machine-listbox" role="listbox" className="absolute z-20 left-0 right-0 mt-1 max-h-[350px] overflow-y-auto border border-line bg-white shadow-lg">
                      {machines === null && (
                        <div className="p-4 text-sm text-muted">Laadin pakiautomaate...</div>
                      )}
                      {machinesError && (
                        <div className="p-4 text-sm text-center">
                          <p className="text-accent font-bold mb-2">Pakiautomaatide laadimine ebaõnnestus.</p>
                          <button type="button" onClick={loadMachines} className="underline text-accent hover:text-accent-dark font-bold text-xs">Proovi uuesti</button>
                        </div>
                      )}
                      {!machinesError && machines !== null && filteredMachines.length === 0 && (
                        <div className="p-4 text-sm text-muted">
                          {machineSearch.trim()
                            ? "Ühtegi pakiautomaati ei leitud."
                            : "Pakiautomaadid pole saadaval."}
                        </div>
                      )}
                      {filteredMachines.map((group) => (
                        <div key={group.city}>
                          <div className="px-3 py-1.5 bg-soft text-xs font-extrabold text-muted uppercase tracking-[0.04em]">
                            {group.city}
                          </div>
                          {group.machines.map((m) => (
                            <button
                              key={`${m.carrier}||${m.id}`}
                              type="button"
                              role="option"
                              aria-selected={selectedMachine?.id === m.id}
                              onClick={() => selectMachine(m)}
                              className={`w-full text-left px-3 py-2 text-sm border-0 bg-transparent hover:bg-soft ${
                                selectedMachine?.id === m.id ? "bg-soft font-extrabold" : ""
                              }`}
                            >
                              {m.name}
                              <span className="block text-xs text-muted">
                                {m.address ? `${m.address}, ` : ""}{m.zip ?? ""} {m.city}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-accent p-3 text-sm text-center text-white">
                {shippingCost > 0 ? (
                  <>
                    <span>Tarne hind </span>
                    <strong>{shippingCost.toFixed(2)} €</strong>
                    {needsMore > 0 && (
                      <>
                        <span>. Lisa {needsMore.toFixed(2)} € eest ja tarne on </span>
                        <strong>TASUTA</strong>
                      </>
                    )}
                  </>
                ) : (
                  <strong>Tasuta tarne</strong>
                )}
                {shippingCost === 0 && <> — Toote saatmine on tasuta alates {shippingRate(data.shipping_method)?.freeFrom ?? 40} eurosest ostust.</>}
              </div>

              <div className="text-sm text-muted">
                <p>
                  <strong className="text-ink">Eeldatav tarneaeg:</strong>{" "}
                  3–14 tööpäeva pärast makse kinnitust.
                </p>
                <p className="mt-1">
                  Makse turvab <strong className="text-ink">Maksekeskus</strong>. Tagastamisõigus kehtib
                  14 päeva jooksul alates kättesaamisest.
                </p>
              </div>
            </fieldset>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <fieldset className="grid gap-5">
              <legend className="font-heading text-2xl mb-5">Kontrolli tellimus</legend>

              <div className="border border-line divide-y divide-line">
                {items.map((item) => (
                  <div key={item.slug} className="grid grid-cols-[1fr_auto] gap-4 p-4">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="block text-sm text-muted">
                        {item.quantity} tk · {item.author}
                      </span>
                    </div>
                    <strong>
                      {((item.salePrice ?? item.price) * item.quantity).toFixed(2)} €
                    </strong>
                  </div>
                ))}
              </div>

              {shippingCost > 0 && (
                <div className="flex justify-between border border-line p-4 text-sm">
                  <span className="text-muted">Tarne ({shippingLabel(data.shipping_method)})</span>
                  <strong>{shippingCost.toFixed(2)} €</strong>
                </div>
              )}

              <div className="border border-ink p-4 mt-6 bg-soft">
                <h3 className="font-heading text-lg mb-3">Tellimuse kokkuvõte</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Raamatud</span>
                    <strong>{total.toFixed(2)} €</strong>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-leaf">
                      <span>Sooduskood</span>
                      <strong>&minus;{couponDiscount.toFixed(2)} €</strong>
                    </div>
                  )}
                  {shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span>Saatmine ({shippingLabel(data.shipping_method)})</span>
                      <strong>{shippingCost.toFixed(2)} €</strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-line text-lg">
                    <span>Kokku</span>
                    <strong>{orderTotal.toFixed(2)} €</strong>
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>sh käibemaks ({KM_PERCENT}%)</span>
                    <span>{vatAmount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 bg-soft border border-line p-4 text-sm">
                <p>
                  <strong>Tellija:</strong> {data.firstName} {data.lastName}, {data.email}, {data.phone}
                </p>
                <p>
                  <strong>Tarne:</strong>{" "}
                  {selectedMachine
                    ? `${shippingLabel(data.shipping_method)} — ${selectedMachine.name}, ${selectedMachine.city}`
                    : shippingLabel(data.shipping_method)}
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="justify-self-start text-accent font-bold"
                >
                  Muuda andmeid
                </button>
              </div>

              <div className="border border-ink p-4">
                <p className="font-extrabold">Pangamakse Maksekeskuse kaudu</p>
                <p className="text-sm text-muted mt-1">
                  Pärast kinnitamist suuname sind turvalisele makselehele, kus saad valida oma
                  panga.
                </p>
              </div>

              <label className="flex gap-3 items-start text-sm">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  required
                  className="mt-1 w-5 h-5"
                />
                <span>
                  Nõustun{" "}
                  <Link href="/kasutustingimused" target="_blank" className="text-accent underline">
                    kasutustingimuste
                  </Link>{" "}
                  ja{" "}
                  <Link
                    href="/privaatsuspoliitika"
                    target="_blank"
                    className="text-accent underline"
                  >
                    privaatsuspoliitikaga
                  </Link>
                  .
                </span>
              </label>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="text-accent font-bold">
              {error}
            </p>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-3 mt-2">
            {step > 1 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="min-h-12 border border-ink px-5 font-bold"
              >
                Tagasi
              </button>
            )}
            <button
              disabled={pending || items.length === 0}
              className="min-h-12 border border-ink bg-white text-ink px-5 font-bold hover:bg-ink hover:text-white disabled:opacity-50"
            >
              {pending
                ? "Suunan maksma…"
                : step === 3
                  ? "Kinnita ja mine maksma"
                  : "Jätka"}
            </button>
          </div>
        </form>
      </div>

      {!compact && (
        <aside className="self-start sticky top-[140px] border border-line bg-soft p-5">
          <h2 className="font-heading text-xl">Tellimuse kokkuvõte</h2>
          <p className="mt-4 text-sm text-muted">
            {items.reduce((sum, item) => sum + item.quantity, 0)} toodet
          </p>
          <div className="mt-4 grid gap-1 text-sm">
            {items.map((item) => (
              <div key={item.slug} className="flex justify-between">
                <span className="truncate pr-2">{item.title}</span>
                <span className="whitespace-nowrap">
                  {((item.salePrice ?? item.price) * item.quantity).toFixed(2)} €
                </span>
              </div>
            ))}
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-line">
              <span>Tarne</span>
              <span>{shippingCost.toFixed(2)} €</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm mt-2 text-leaf">
              <span>Soodustus</span>
              <span>&minus;{couponDiscount.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between mt-4 pt-4 border-t border-line text-xl font-extrabold">
            <span>Kokku</span>
            <span>{orderTotal.toFixed(2)} €</span>
          </div>
          {shippingCost > 0 && needsMore > 0 ? (
            <p className="text-sm text-muted mt-3">
              Lisa veel {needsMore.toFixed(2)} € eest ja tarne on tasuta
            </p>
          ) : shippingCost === 0 ? (
            <p className="text-sm text-leaf font-bold mt-3">
              Tasuta tarne alates {shippingRate(data.shipping_method)?.freeFrom ?? 40} €
            </p>
          ) : null}
          <p className="text-xs text-muted mt-3">
            Lõplik summa ja saadavus kontrollitakse enne makse loomist.
          </p>
        </aside>
      )}
    </div>
  );
}
