"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveCoupon, toggleCoupon, deleteCoupon } from "@/app/haldus/coupon-actions";

export interface CouponRow {
  id: string;
  code: string;
  percent: number;
  max_discount: number;
  is_active: boolean;
}

export function CouponsSection({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(saveCoupon, undefined);

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [router, state?.success]);

  return (
    <section className="mt-10 border border-line bg-panel p-6">
      <h2 className="font-heading text-2xl mb-1">Sooduskupongid</h2>
      <p className="text-sm text-muted mb-6">Kupongid rakenduvad kassas kohe — eraldi avaldamist pole vaja.</p>

      <form action={action} className="grid grid-cols-[1fr_140px_180px_auto] gap-3 items-end mb-8 max-sm:grid-cols-1">
        <label className="grid gap-1 text-sm font-bold">
          Kood
          <input name="code" required minLength={2} maxLength={50} placeholder="nt SUGIS2026"
            className="h-11 border border-line bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Allanihind %
          <input name="percent" required type="number" min="0.01" max="100" step="0.01" placeholder="10"
            className="h-11 border border-line bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Maks. allahindlus €
          <input name="max_discount" required type="number" min="0" step="0.01" placeholder="50"
            className="h-11 border border-line bg-white px-3 font-normal" />
        </label>
        <button disabled={pending} className="h-11 px-6 bg-ink text-white font-bold hover:bg-accent transition-colors disabled:opacity-50">
          {pending ? "Salvestan…" : "Lisa kupong"}
        </button>
        {state?.error && <p className="col-span-full text-sm text-red-700">{state.error}</p>}
        {state?.success && <p className="col-span-full text-sm text-leaf">Kupong salvestatud.</p>}
      </form>

      {coupons.length === 0 ? (
        <p className="text-muted text-sm">Ühtegi kupongi pole veel lisatud.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="py-2 pr-4">Kood</th>
              <th className="py-2 pr-4">Allahindlus</th>
              <th className="py-2 pr-4">Staatus</th>
              <th className="py-2 text-right">Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="border-b border-line last:border-0">
                <td className="py-2 pr-4 font-bold">{coupon.code}</td>
                <td className="py-2 pr-4">-{Number(coupon.percent)}% (max {Number(coupon.max_discount)} €)</td>
                <td className="py-2 pr-4">{coupon.is_active ? <span className="text-leaf font-bold">Aktiivne</span> : <span className="text-muted">Peidetud</span>}</td>
                <td className="py-2 text-right">
                  <form action={async (fd) => { await toggleCoupon(fd); router.refresh(); }} className="inline">
                    <input type="hidden" name="id" value={coupon.id} />
                    <input type="hidden" name="is_active" value={String(coupon.is_active)} />
                    <button className="text-accent font-bold hover:underline mr-4">{coupon.is_active ? "Peida" : "Aktiveeri"}</button>
                  </form>
                  <form action={async (fd) => { await deleteCoupon(fd); router.refresh(); }} className="inline"
                    onSubmit={(e) => { if (!window.confirm(`Kustutan kupongi ${coupon.code}?`)) e.preventDefault(); }}>
                    <input type="hidden" name="id" value={coupon.id} />
                    <button className="text-red-700 font-bold hover:underline">Kustuta</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
