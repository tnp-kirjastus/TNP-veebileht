"use client";

import { useState, useRef } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { compareImport, applyImport } from "@/app/haldus/import-actions";

interface ImportRow {
  row: number;
  sku: string;
  title: string;
  status: "new" | "update" | "unchanged" | "conflict" | "invalid";
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  errors: string[];
}

type ImportMode = "full" | "partial" | "stock" | "price";

export default function ImportPage() {
  const [step, setStep] = useState<"upload" | "compare" | "apply">("upload");
  const [fileData, setFileData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ sku: "isbn", title: "title", price: "price", stock: "stock", description: "description" });
  const [mode, setMode] = useState<ImportMode>("partial");
  const [results, setResults] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      if (file.name.endsWith(".csv") || file.name.endsWith(".tsv")) {
        const text = await file.text();
        const delim = file.name.endsWith(".tsv") ? "\t" : ",";
        const lines = text.split("\n").filter(Boolean);
        const hdrs = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(delim).map((v) => v.trim().replace(/^"|"$/g, ""));
          const obj: Record<string, string> = {};
          hdrs.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
          return obj;
        });
        setHeaders(hdrs);
        setFileData(rows);
      } else {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        setHeaders(Object.keys(json[0] ?? {}));
        setFileData(json);
      }
    } catch (err) {
      setError(`Faili lugemine ebaõnnestus: ${String(err)}`);
    }
  }

  async function doCompare() {
    setBusy(true);
    setError("");
    try {
      const payload = JSON.stringify({ rows: fileData, mode, mapping });
      const fd = new FormData();
      fd.set("payload", payload);
      const result = await compareImport({}, fd);
      if (result.results) {
        setResults(result.results);
        setStep("compare");
      } else {
        setError(result.error ?? "Võrdlemine ebaõnnestus.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function doApply() {
    setBusy(true);
    setError("");
    try {
      const payload = JSON.stringify({ rows: fileData, mode, mapping });
      const fd = new FormData();
      fd.set("payload", payload);
      const result = await applyImport({}, fd);
      if (result.success) {
        setApplied(result.applied ?? 0);
        setStep("apply");
      } else {
        setError(result.error ?? "Rakendamine ebaõnnestus.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  const summary = {
    new: results.filter((r) => r.status === "new").length,
    update: results.filter((r) => r.status === "update").length,
    unchanged: results.filter((r) => r.status === "unchanged").length,
    conflict: results.filter((r) => r.status === "conflict").length,
    invalid: results.filter((r) => r.status === "invalid").length,
  };

  return (
    <>
      <AdminPageHeader
        title="Impordi kataloog"
        description="Laadi üles XLSX, CSV või TSV fail ja võrdle olemasoleva kataloogiga."
        breadcrumbs={[{ label: "Ülevaade", href: "/haldus" }, { label: "Import" }]}
      />

      {error && <div className="p-4 bg-accent/10 text-accent font-bold text-sm mb-6">{error}</div>}

      {/* Upload step */}
      {(step === "upload" || step === "compare") && (
        <div className="border border-line bg-panel p-6 mb-6">
          <h2 className="font-heading text-xl mb-4">1. Faili üleslaadimine</h2>
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="grid gap-1 flex-1 min-w-0">
              <label className="text-xs font-bold text-muted">Fail (XLSX, CSV, TSV)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv" onChange={handleFile}
                className="border border-line bg-paper p-3 text-sm" />
            </div>
            <div className="grid gap-1">
              <label className="text-xs font-bold text-muted">Impordi režiim</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}
                className="h-11 border border-line bg-paper px-3 text-sm font-bold">
                <option value="partial">Osaline uuendus</option>
                <option value="full">Täielik ülevaade</option>
                <option value="stock">Ainult laoseis</option>
                <option value="price">Ainult hind</option>
              </select>
            </div>
          </div>

          {fileData.length > 0 && (
            <>
              <h3 className="font-bold text-sm mb-2">Veerude vastendamine</h3>
              <p className="text-xs text-muted mb-3">Määra, milline veerg vastab millisele toote väljale.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {(["sku", "title", "price", "stock", "description"] as const).map((field) => (
                  <label key={field} className="grid gap-1 text-xs font-bold">
                    {field === "sku" ? "ISBN" : field === "title" ? "Pealkiri" : field === "price" ? "Hind" : field === "stock" ? "Laoseis" : "Kirjeldus"}
                    <select value={mapping[field] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                      className="border border-line bg-paper p-2 font-normal text-xs">
                      <option value="">— Ignoreeri —</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <button type="button" onClick={doCompare} disabled={busy}
                className="min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50">
                {busy ? "Võrdlen…" : "2. Võrdle kataloogiga"}
              </button>
            </>
          )}
          {fileData.length > 0 && (
            <p className="text-xs text-muted mt-3">{fileData.length} rida leitud.</p>
          )}
        </div>
      )}

      {/* Compare results */}
      {step === "compare" && results.length > 0 && (
        <div className="border border-line bg-panel p-6 mb-6">
          <h2 className="font-heading text-xl mb-4">2. Võrdluse tulemused</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            {summary.new > 0 && <StatusBadge variant="active" label={`${summary.new} uut`} />}
            {summary.update > 0 && <StatusBadge variant="sale" label={`${summary.update} uuendatavat`} />}
            {summary.unchanged > 0 && <span className="text-xs text-muted font-bold">{summary.unchanged} muutmata</span>}
            {summary.conflict > 0 && <StatusBadge variant="out" label={`${summary.conflict} vastuolu`} />}
            {summary.invalid > 0 && <StatusBadge variant="out" label={`${summary.invalid} vigast`} />}
          </div>

          <div className="overflow-x-auto border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft">
                <tr>
                  <th className="p-3 text-xs uppercase tracking-wider text-muted">Rida</th>
                  <th className="p-3 text-xs uppercase tracking-wider text-muted">ISBN</th>
                  <th className="p-3 text-xs uppercase tracking-wider text-muted">Pealkiri</th>
                  <th className="p-3 text-xs uppercase tracking-wider text-muted">Olek</th>
                  <th className="p-3 text-xs uppercase tracking-wider text-muted">Muudatused</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={`border-t border-line ${r.status === "invalid" || r.status === "conflict" ? "bg-accent/5" : r.status === "new" ? "bg-leaf/5" : r.status === "update" ? "bg-amber-50" : ""}`}>
                    <td className="p-3 text-muted text-xs">{r.row}</td>
                    <td className="p-3 font-mono text-xs">{r.sku}</td>
                    <td className="p-3 font-bold">{r.title || <span className="text-muted">—</span>}</td>
                    <td className="p-3">
                      {r.status === "new" ? <StatusBadge variant="active" label="Uus" /> :
                       r.status === "update" ? <StatusBadge variant="sale" label="Uuendus" /> :
                       r.status === "unchanged" ? <span className="text-xs text-muted">Muutmata</span> :
                       r.status === "conflict" ? <StatusBadge variant="out" label="Konflikt" /> :
                       <StatusBadge variant="out" label="Vigane" />}
                    </td>
                    <td className="p-3">
                      {r.errors.length > 0 && <div className="text-xs text-accent">{r.errors.join(", ")}</div>}
                      {r.changes.map((ch, j) => (
                        <div key={j} className="text-xs">
                          <span className="font-bold">{ch.field}:</span>{" "}
                          <span className="text-muted line-through">{String(ch.before)}</span>
                          {" → "}
                          <span className="text-leaf font-bold">{String(ch.after)}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={doApply} disabled={busy}
            className="mt-6 min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80 disabled:opacity-50">
            {busy ? "Rakendan…" : "3. Rakenda muudatused"}
          </button>
        </div>
      )}

      {/* Applied */}
      {step === "apply" && applied !== null && (
        <div className="p-8 border border-leaf/30 bg-leaf/5 text-center">
          <h2 className="font-heading text-2xl mb-4 text-leaf">Import rakendatud</h2>
          <p className="text-lg font-bold">{applied} toodet imporditud või uuendatud.</p>
          <button type="button" onClick={() => { setStep("upload"); setApplied(null); setFileData([]); setResults([]); if (fileRef.current) fileRef.current.value = ""; }}
            className="mt-4 min-h-12 px-8 bg-ink text-white font-bold hover:bg-ink/80">
            Uus import
          </button>
        </div>
      )}
    </>
  );
}
