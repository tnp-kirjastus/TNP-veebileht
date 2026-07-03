"use client";

import { useState, useCallback } from "react";
import { useActionState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatEuro } from "@/lib/product-utils";
import { bulkEditProducts, searchProducts } from "@/app/haldus/bulk-actions";

interface ProductBrief {
  id: string;
  sku: string;
  title_et: string;
  price: number;
  stock: number;
  is_archived: boolean;
  is_upcoming: boolean;
}

type BulkAction = "set_state_active" | "set_state_upcoming" | "archive" | "unarchive" | "set_price" | "set_sale_price" | "clear_sale_price" | "set_stock" | "adjust_stock" | "set_origin" | "set_featured" | "clear_featured";

const actionLabels: Record<BulkAction, string> = {
  set_state_active: "M\u00e4rgi aktiivseks",
  set_state_upcoming: "M\u00e4rgi ilmuvaks",
  archive: "Arhiveeri",
  unarchive: "Taasta arhiivist",
  set_price: "M\u00e4\u00e4ra hind",
  set_sale_price: "M\u00e4\u00e4ra soodushind",
  clear_sale_price: "Eemalda soodushind",
  set_stock: "M\u00e4\u00e4ra laoseis",
  adjust_stock: "Muuda laoseisu (+/-)",
  set_origin: "M\u00e4\u00e4ra p\u00e4ritolu",
  set_featured: "Lisa esilet\u00f5stetuks",
  clear_featured: "Eemalda esilet\u00f5stetud",
};

export default function BulkEditPage() {
  const [state, action, pending] = useActionState(bulkEditProducts, undefined);
  const [products, setProducts] = useState<ProductBrief[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BulkAction>("set_state_active");
  const [actionValue, setActionValue] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastBatch, setLastBatch] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    const data = await searchProducts(q, 200);
    setProducts(data);
    setLoading(false);
  }, []);

  if (state?.result && state.result.batchId !== lastBatch) {
    setLastBatch(String(state.result.batchId));
    setSelectedIds(new Set());
    setShowConfirm(false);
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  const needsValue = ["set_price", "set_sale_price", "set_stock", "adjust_stock", "set_origin"].includes(selectedAction);

  return (
    <>
      <AdminPageHeader
        title="Partii muutmine"
        description={`Vali tooted ja rakenda \u00fchne muudatus. ${selectedIds.size} toodet valitud.`}
        breadcrumbs={[{ label: "\u00dclevaade", href: "/haldus" }, { label: "Tooted", href: "/haldus/tooted" }, { label: "Partii muutmine" }]}
      />

      <div className="flex flex-wrap items-end gap-4 mb-6 p-5 border border-line bg-soft">
        <div className="grid gap-1">
          <label className="text-xs font-bold text-muted">Tegevus</label>
          <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value as BulkAction)}
            className="h-11 border border-line bg-paper px-3 text-sm font-bold min-w-[200px]">
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {needsValue && (
          <div className="grid gap-1">
            <label className="text-xs font-bold text-muted">V\u00e4\u00e4rtus</label>
            {selectedAction === "set_origin" ? (
              <select value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                className="h-11 border border-line bg-paper px-3 text-sm font-bold">
                <option value="">Vali\u2026</option>
                <option value="estonian">Eesti</option>
                <option value="foreign">V\u00e4lismaine</option>
              </select>
            ) : (
              <input type="number" step="0.01" value={actionValue} onChange={(e) => setActionValue(e.target.value)}
                placeholder={selectedAction === "adjust_stock" ? "+5 v\u00f5i -3" : "0"}
                className="h-11 border border-line bg-paper px-3 text-sm w-40" />
            )}
          </div>
        )}
        <button type="button" disabled={selectedIds.size === 0} onClick={() => setShowConfirm(true)}
          className="h-11 px-6 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-30 disabled:cursor-not-allowed">
          Rakenda valituile ({selectedIds.size})
        </button>
        <button type="button" onClick={() => setSelectedIds(new Set())} disabled={selectedIds.size === 0}
          className="h-11 px-4 border border-line font-bold text-sm text-muted hover:text-ink disabled:opacity-30">
          T\u00fchista valik
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") doSearch(search); }}
          placeholder="Otsi tooteid pealkirja v\u00f5i ISBN-i j\u00e4rgi\u2026"
          className="flex-1 min-w-0 h-11 border border-line bg-paper px-4 outline-none text-sm" />
        <button type="button" onClick={() => doSearch(search)} disabled={loading}
          className="h-11 px-5 bg-ink text-white text-sm font-bold hover:bg-ink/80 disabled:opacity-50">
          Otsi
        </button>
      </div>

      <div className="overflow-x-auto border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft">
            <tr>
              <th className="w-12 p-4">
                <input type="checkbox" checked={products.length > 0 && selectedIds.size === products.length} onChange={toggleAll} className="accent-ink h-4 w-4" />
              </th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Raamat</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Hind</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Ladu</th>
              <th className="p-4 font-extrabold text-xs uppercase tracking-wider text-muted">Olek</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-line animate-pulse"><td colSpan={5} className="p-4"><div className="h-4 bg-soft w-3/4" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted">Sisesta otsing ja vajuta &quot;Otsi&quot;.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={`border-t border-line hover:bg-soft/50 ${selectedIds.has(p.id) ? "bg-leaf/5" : ""}`}>
                  <td className="p-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggle(p.id)} className="accent-ink h-4 w-4" /></td>
                  <td className="p-4"><span className="font-bold">{p.title_et}</span><div className="text-xs text-muted">{p.sku}</div></td>
                  <td className="p-4 font-bold">{formatEuro(p.price)}</td>
                  <td className="p-4">{p.stock}</td>
                  <td className="p-4">
                    {p.is_archived ? <StatusBadge variant="archived" /> : p.is_upcoming ? <StatusBadge variant="upcoming" /> : <StatusBadge variant="active" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-panel border border-line p-8 max-w-lg w-full shadow-lg">
            <h2 className="font-heading text-xl mb-2">Kinnita partii muudatus</h2>
            <p className="text-muted text-sm mb-2">
              <strong>{actionLabels[selectedAction]}</strong>
              {actionValue ? ` \u2014 v\u00e4\u00e4rtus: ${actionValue}` : ""}
            </p>
            <p className="text-sm mb-6">See muudatus rakendatakse <strong>{selectedIds.size}</strong> tootele. Kas j\u00e4tkata?</p>

            <form action={action}>
              <input type="hidden" name="ids" value={Array.from(selectedIds).join(",")} />
              <input type="hidden" name="action" value={selectedAction} />
              <input type="hidden" name="value" value={actionValue} />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowConfirm(false)} className="px-5 py-2.5 border border-line text-sm font-bold hover:bg-soft">T\u00fchista</button>
                <button type="submit" disabled={pending} className="px-5 py-2.5 bg-ink text-white text-sm font-bold hover:bg-ink/80 disabled:opacity-50">
                  {pending ? "Rakendan\u2026" : `Rakenda ${selectedIds.size} tootele`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {state?.result && (
        <div className="mt-6 p-6 border border-leaf/30 bg-leaf/5">
          <h3 className="font-heading text-lg mb-2 text-leaf">Muudatus rakendatud</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="font-bold text-leaf">{state.result.updated}</span> uuendatud</div>
            <div><span className="font-bold">{state.result.skipped}</span> vahele j\u00e4etud</div>
            <div><span className="font-bold text-accent">{Array.isArray(state.result.errors) ? state.result.errors.length : 0}</span> viga</div>
          </div>
          {Array.isArray(state.result.errors) && state.result.errors.length > 0 && (
            <div className="mt-3"><p className="text-xs font-bold text-accent mb-1">Vead:</p>
              <ul className="text-xs text-accent list-disc pl-4">{state.result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
