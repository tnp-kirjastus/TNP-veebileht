import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filepath) {
  try {
    const content = readFileSync(filepath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  } catch { /* ignore */ }
}
loadEnv(resolve(__dirname, "..", ".env.local"));

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const EXCEL_PATH = process.env.EXCEL_PATH || "D:/WORKS/TNP/Mockups-v5/raamatud.xlsx";
const PREVIEW = process.argv.includes("--preview");

const EXCEL_TO_DB_NAME = {
  "Ajalugu": "Ajalugu ja poliitika",
  "Elulood": "Elulood ja memuaarid",
  "Huumor": "Huumor",
  "Kinkeraamatud": "Kinkeraamatud",
  "Teatmeteosed": "Teatmeteosed",
  "Eesti ilukirjandus": "Ilukirjandus",
  "Välismaa ilukirjandus": "Ilukirjandus",
  "välismaa ilukirjandus": "Ilukirjandus",
  "Välismaa mitteilukirjandus": "Varia",
  "välismaa mitteilukirjandus": "Varia",
  "Eesti mitteilukirjandus": "Varia",
  "Laste- ja noorteraamatud": "Lasteraamatud",
  "Käsiraamatud": "Teatmeteosed",
  "Looduse lood": "Loodus",
  "Inspektor Morse'i juhtumid": "Põnevus ja krimi",
  "Bodensteini ja Kirchhoffi lood": "Põnevus ja krimi",
  "Agatha Raisin": "Põnevus ja krimi",
  "Leskede klubi": "Ajaviitekirjandus",
  "Tänapäeva noorsooromaan": "Noortekirjandus",
  "Prantsuse köide": "Varia",
  "Punane raamat": "Varia",
  "Säravad naised": "Ajaviitekirjandus",
  "Äriraamatud": "Varia",
};

console.log("Reading Excel:", EXCEL_PATH);
const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws);
console.log(`Total rows: ${rows.length}`);

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const productsAll = [];
let pFrom = 0;
const pSize = 1000;
while (true) {
  const { data, error } = await db.schema("commerce").from("products").select("id,sku").range(pFrom, pFrom + pSize - 1);
  if (error) throw error;
  if (!data || data.length === 0) break;
  productsAll.push(...data);
  if (data.length < pSize) break;
  pFrom += pSize;
}
const skuToId = new Map();
for (const p of productsAll) skuToId.set(String(p.sku).trim(), p.id);
console.log(`Products in DB: ${skuToId.size}`);

const { data: allCats } = await db.schema("commerce").from("categories").select("id, name_et, slug");
if (!allCats) { console.error("No categories found"); process.exit(1); }
const catNameToId = new Map();
const catSlugToEntry = new Map();
for (const c of allCats) {
  catNameToId.set(c.name_et, c.id);
  catSlugToEntry.set(c.slug, { id: c.id, name: c.name_et });
}
console.log(`Categories in DB: ${allCats.length}`);

// Build reverse mapping: which DB names exist?
const missingMappings = new Set();
for (const [excelName, dbName] of Object.entries(EXCEL_TO_DB_NAME)) {
  if (!catNameToId.has(dbName)) {
    missingMappings.add(dbName);
  }
}
if (missingMappings.size > 0) {
  console.log("\nWARNING: These target category names not found in DB:");
  for (const m of missingMappings) console.log(`  - "${m}"`);
  console.log("DB categories:");
  for (const c of allCats) console.log(`  "${c.name_et}" | ${c.slug}`);
}

// "Ilukirjandus" appears twice in DB (slug ilukirjandus and laste-ilukirjandus).
// Use the one with slug "ilukirjandus" (the general fiction one).
const ilukirjandusId = catSlugToEntry.get("ilukirjandus")?.id;
if (ilukirjandusId) {
  // Override mappings that target "Ilukirjandus" to use this specific ID
  for (const [excelName, dbName] of Object.entries(EXCEL_TO_DB_NAME)) {
    if (dbName === "Ilukirjandus") {
      // We'll handle this in the build step
    }
  }
}

// Build final mapping: excel name → category_id
const mapping = new Map();
for (const [excelName, dbName] of Object.entries(EXCEL_TO_DB_NAME)) {
  if (dbName === "Ilukirjandus" && ilukirjandusId) {
    mapping.set(excelName, ilukirjandusId);
  } else {
    const id = catNameToId.get(dbName);
    if (id) mapping.set(excelName, id);
  }
}

console.log(`\nMapped ${mapping.size} Excel categories to DB categories`);

// Collect all category links
const links = [];
const seen = new Set();
let skippedSku = 0;
let skippedCat = 0;

for (const row of rows) {
  const sku = String(row["SKU"] || "").trim();
  const catRaw = String(row["Tootekategooriad"] || "").trim();

  if (!sku || !catRaw) continue;

  const productId = skuToId.get(sku);
  if (!productId) { skippedSku++; continue; }

  const catNames = catRaw.split("|").map((s) => s.trim()).filter(Boolean);
  for (const name of catNames) {
    const catId = mapping.get(name);
    if (!catId) { skippedCat++; continue; }
    const key = `${productId}:${catId}`;
    if (!seen.has(key)) {
      seen.add(key);
      links.push({ product_id: productId, category_id: catId });
    }
  }
}

console.log(`Category links to create: ${links.length}`);
console.log(`SKUs not found in DB: ${skippedSku}`);
console.log(`Unmapped category refs: ${skippedCat}`);

if (PREVIEW) {
  console.log("\nPreview mode - sample links:");
  for (const l of links.slice(0, 10)) {
    const product = productsAll.find(p => p.id === l.product_id);
    const cat = allCats.find(c => c.id === l.category_id);
    console.log(`  ${product?.sku} → ${cat?.name_et}`);
  }
  process.exit(0);
}

// Insert in batches
let inserted = 0;
const batchSize = 500;
for (let i = 0; i < links.length; i += batchSize) {
  const batch = links.slice(i, i + batchSize);
  const { error } = await db.schema("commerce").from("product_categories").upsert(batch, {
    onConflict: "product_id,category_id",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error(`Batch error at ${i}:`, error.message);
  } else {
    inserted += batch.length;
    console.log(`  Inserted ${i + batch.length}/${links.length}`);
  }
}

console.log(`\nDone. ${inserted} category links created.`);
console.log("Run 'npm run regen-json' to rebuild the JSON cache.");
