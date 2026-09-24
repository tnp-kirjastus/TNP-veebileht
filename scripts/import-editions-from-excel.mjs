// One-off: kannab raamatud.xlsx veerust "Toote Ilmumiskuupäev" (DD.MM.YYYY,
// eraldatud "|"-ga) andmebaasi:
//   - release_date = varaseim kuupäev (esmatrükk, "Ilmumine")
//   - editions     = ülejäänud kuupäevad kronoloogiliselt [{type:"2. trükk", date}, ...]
// Teisi välju ei puuduta. Kasutus:
//   node scripts/import-editions-from-excel.mjs --preview   # kuivjooks, midagi ei kirjuta
//   node scripts/import-editions-from-excel.mjs             # rakendab muudatused
// Vajalik Windowsis: NODE_OPTIONS=--use-system-ca (Supabase'i sertifikaat).

import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const PREVIEW = process.argv.includes("--preview");
const EXCEL_PATH = process.env.EXCEL_PATH || "D:/WORKS/TNP/raamatud.xlsx";

// .env.local käsitsi parsimine (dotenv'i pole projektis)
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeSku(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number") return String(Math.round(value));
  return String(value).trim().replace(/[^0-9Xx]/g, "").toUpperCase();
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

function parseEtDate(str) {
  const s = String(str).trim();
  // Excel'i kuupäevaseriaal (nt 38866), kui lahter on kuupäevavormingus
  if (/^\d{5}$/.test(s)) {
    const serial = Number(s);
    if (serial >= 20000 && serial <= 60000) {
      return new Date(EXCEL_EPOCH + serial * 86_400_000).toISOString().slice(0, 10);
    }
    return null;
  }
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date.toISOString().slice(0, 10);
}

function parseDateList(raw) {
  if (raw == null || raw === "") return { dates: [], bad: [] };
  const parts = String(raw).split("|").map((s) => s.trim()).filter(Boolean);
  const dates = [];
  const bad = [];
  for (const p of parts) {
    const iso = parseEtDate(p);
    if (iso) dates.push(iso);
    else bad.push(p);
  }
  return { dates: [...new Set(dates)].sort(), bad };
}

// --- Loe Excel ---
const wb = XLSX.readFile(EXCEL_PATH);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

const bySku = new Map();
const anomalies = [];
let dupSkus = 0;
for (const row of rows) {
  const sku = normalizeSku(row["SKU"]);
  if (!sku) continue;
  if (bySku.has(sku)) { dupSkus++; continue; }
  const { dates, bad } = parseDateList(row["Toote Ilmumiskuupäev"]);
  if (bad.length) anomalies.push({ sku, title: row["Title"], bad });
  bySku.set(sku, { title: String(row["Title"] ?? ""), dates });
}

// --- Loe andmebaas ---
const products = [];
let from = 0;
while (true) {
  const { data, error } = await supabase
    .schema("commerce").from("products")
    .select("id,sku,title_et,release_date,editions")
    .range(from, from + 999);
  if (error) { console.error("DB lugemine ebaõnnestus:", error.message); process.exit(1); }
  if (!data || data.length === 0) break;
  products.push(...data);
  if (data.length < 1000) break;
  from += 1000;
}

// --- Võrdle ja koosta uuendused ---
const updates = [];
const unmatched = [];
let alreadyOk = 0;
for (const p of products) {
  const sku = normalizeSku(p.sku);
  const file = bySku.get(sku);
  if (!file) { unmatched.push({ sku, title: p.title_et }); continue; }
  if (file.dates.length === 0) { alreadyOk++; continue; }
  const releaseDate = file.dates[0];
  const editions = file.dates.slice(1).map((date, i) => ({ type: `${i + 2}. trükk`, date }));
  const oldRelease = p.release_date ? String(p.release_date).slice(0, 10) : null;
  const oldEditions = Array.isArray(p.editions) ? p.editions : [];
  const sameRelease = oldRelease === releaseDate;
  const sameEditions = JSON.stringify(oldEditions) === JSON.stringify(editions);
  if (sameRelease && sameEditions) { alreadyOk++; continue; }
  updates.push({ id: p.id, sku, title: p.title_et, release_date: releaseDate, editions, oldRelease, oldEditions });
}

const withReprints = updates.filter((u) => u.editions.length > 0);

console.log(`Excel: ${bySku.size} unikaalset ISBN-i (${dupSkus} duplikaatrida jäeti vahele)`);
console.log(`Andmebaas: ${products.length} toodet`);
console.log(`Uuendamist vajavad: ${updates.length} (sh ${withReprints.length} kordustrükkidega)`);
console.log(`Juba korras / kuupäevata: ${alreadyOk}`);
console.log(`Excelis puuduvad (DB tooted, mida failis pole): ${unmatched.length}`);
if (anomalies.length) {
  console.log(`\nKUUPÄEVAANOMALIAD (${anomalies.length}):`);
  for (const a of anomalies.slice(0, 20)) console.log(`  ${a.sku} ${a.title} — parsimata: ${a.bad.join(", ")}`);
}
console.log("\nNÄIDISED:");
for (const u of updates.slice(0, 5)) {
  console.log(`  ${u.sku} ${u.title}\n    release_date: ${u.oldRelease ?? "—"} → ${u.release_date}\n    editions: ${JSON.stringify(u.editions)}`);
}
for (const u of withReprints.slice(0, 5)) {
  if (updates.slice(0, 5).includes(u)) continue;
  console.log(`  ${u.sku} ${u.title}\n    release_date: ${u.oldRelease ?? "—"} → ${u.release_date}\n    editions: ${JSON.stringify(u.editions)}`);
}

if (PREVIEW) {
  console.log("\n--preview: andmebaasi ei kirjutatud.");
  process.exit(0);
}

// --- Rakenda ---
let applied = 0;
const failed = [];
for (const u of updates) {
  const { error } = await supabase
    .schema("commerce").from("products")
    .update({ release_date: u.release_date, editions: u.editions })
    .eq("id", u.id);
  if (error) failed.push({ sku: u.sku, title: u.title, error: error.message });
  else applied++;
}
console.log(`\nRakendatud: ${applied}, ebaõnnestus: ${failed.length}`);
for (const f of failed.slice(0, 20)) console.log(`  FAIL ${f.sku} ${f.title}: ${f.error}`);
