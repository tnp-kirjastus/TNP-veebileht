import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "node:fs";
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
  console.error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dataDir = resolve(__dirname, "..", "src", "data");

async function fetchAll(table, columns = "*") {
  const all = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await db.schema("commerce").from(table).select(columns).range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

async function fetchPeopleAll() {
  const all = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await db.schema("people").from("people").select("id,name,slug").range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

function now() {
  return new Date().toISOString().split("T")[0];
}

async function main() {
  console.log(`[${now()}] Regenerating JSON catalogue from Supabase...`);

  // 1. Products
  const dbProducts = await fetchAll("products");
  console.log(`  Fetched ${dbProducts.length} products`);

  // 2. Categories (from commerce.categories with parent info)
  const allCategoriesRaw = [];
  let catFrom = 0;
  const catSize = 1000;
  while (true) {
    const { data, error } = await db.schema("commerce").from("categories")
      .select("id,name_et,slug,parent_id,sort_order")
      .range(catFrom, catFrom + catSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allCategoriesRaw.push(...data);
    if (data.length < catSize) break;
    catFrom += catSize;
  }
  console.log(`  Fetched ${allCategoriesRaw.length} categories`);

  // 3. Series (from content.series where FK references)
  const { data: series } = await db.schema("content").from("series").select("name_et,slug");
  console.log(`  Fetched ${series?.length ?? 0} series`);

  // 4. People
  const people = await fetchPeopleAll();
  console.log(`  Fetched ${people.length} people`);

  // Transform products to JSON format

  const allCategoriesMap = new Map();
  for (const c of allCategoriesRaw) {
    allCategoriesMap.set(c.id, c.name_et);
  }

  const productCategoriesMap = new Map();
  const pcAll = [];
  let pcFrom = 0;
  const pcSize = 1000;
  while (true) {
    const { data: pcRows, error: pcErr } = await db.schema("commerce").from("product_categories")
      .select("product_id, category_id")
      .range(pcFrom, pcFrom + pcSize - 1);
    if (pcErr) throw pcErr;
    if (!pcRows || pcRows.length === 0) break;
    pcAll.push(...pcRows);
    if (pcRows.length < pcSize) break;
    pcFrom += pcSize;
  }
  for (const row of pcAll) {
    const catName = allCategoriesMap.get(row.category_id);
    if (catName && row.product_id) {
      const list = productCategoriesMap.get(row.product_id) || [];
      list.push(catName);
      productCategoriesMap.set(row.product_id, list);
    }
  }

  const productPeopleMap = new Map();

  const allPeopleMap = new Map();
  for (const p of people) {
    allPeopleMap.set(p.id, p.name);
  }

  const ppAll = [];
  let ppFrom = 0;
  const ppSize = 1000;
  while (true) {
    const { data: ppRows, error: ppErr } = await db.schema("commerce").from("product_people")
      .select("product_id, person_id, role")
      .range(ppFrom, ppFrom + ppSize - 1);
    if (ppErr) throw ppErr;
    if (!ppRows || ppRows.length === 0) break;
    ppAll.push(...ppRows);
    if (ppRows.length < ppSize) break;
    ppFrom += ppSize;
  }

  for (const row of ppAll) {
    if (!row.product_id || !row.person_id) continue;
    const personName = allPeopleMap.get(row.person_id);
    if (!personName) continue;
    const role = String(row.role ?? "author");
    const map = productPeopleMap.get(row.product_id) || {};
    const list = map[role] || [];
    list.push(personName);
    map[role] = list;
    productPeopleMap.set(row.product_id, map);
  }

  const productSeriesMap = new Map();

  const allSeriesForMap = [];
  let sFrom = 0;
  const sSize = 1000;
  while (true) {
    const { data: sRows, error: sErr } = await db.schema("content").from("series")
      .select("id, slug, name_et")
      .range(sFrom, sFrom + sSize - 1);
    if (sErr) throw sErr;
    if (!sRows || sRows.length === 0) break;
    allSeriesForMap.push(...sRows);
    if (sRows.length < sSize) break;
    sFrom += sSize;
  }

  const allSeriesMap = new Map();
  for (const s of allSeriesForMap) {
    allSeriesMap.set(s.id, { series_slug: s.slug, series_name: s.name_et });
  }

  for (const p of dbProducts) {
    if (p.series_id && allSeriesMap.has(p.series_id)) {
      productSeriesMap.set(p.id, allSeriesMap.get(p.series_id));
    }
  }

  const jsonProducts = dbProducts.map((p, idx) => {
    const cats = productCategoriesMap.get(p.id) || [];
    const people = productPeopleMap.get(p.id) || {};
    const series = productSeriesMap.get(p.id);
    return {
      id: idx + 1000,
      sku: String(p.sku ?? ""),
      title_et: String(p.title_et ?? ""),
      title_en: p.title_en || null,
      slug: String(p.slug ?? ""),
      description_et: p.description_et || null,
      price: Number(p.price ?? 0),
      sale_price: p.sale_price != null ? Number(p.sale_price) : null,
      sale_start: p.sale_start || null,
      sale_end: p.sale_end || null,
      stock: Number(p.stock ?? 0),
      binding: p.binding || null,
      pages: p.pages != null ? Number(p.pages) : null,
      release_date: p.release_date || null,
      origin: p.origin || "estonian",
      is_upcoming: Boolean(p.is_upcoming),
      is_archived: Boolean(p.is_archived),
      allow_preorder: Boolean(p.allow_preorder ?? true),
      cover_image: p.cover_image || null,
      series_name: series?.series_name || null,
      series_slug: series?.series_slug || null,
      categories: cats,
      people,
      editions: p.editions ?? [],
      latest_release_date: p.latest_release_date ?? null,
    };
  });

  // Write products.json
  writeFileSync(resolve(dataDir, "products.json"), JSON.stringify(jsonProducts, null, "\t"), "utf-8");
  console.log(`  Wrote ${jsonProducts.length} products to products.json`);

  // Write categories.json with hierarchical structure
  {
    const idToSlug = new Map();
    for (const c of allCategoriesRaw) {
      idToSlug.set(c.id, c.slug);
    }
    const catJson = allCategoriesRaw
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(c => ({
        name: c.name_et,
        slug: c.slug,
        ...(c.parent_id && idToSlug.has(c.parent_id) ? { parent: idToSlug.get(c.parent_id) } : {}),
      }));
    writeFileSync(resolve(dataDir, "categories.json"), JSON.stringify(catJson, null, "\t"), "utf-8");
    console.log(`  Wrote ${catJson.length} categories to categories.json`);
  }

  // Write series.json
  if (series) {
    const seriesJson = series.map(s => ({ name: s.name_et, slug: s.slug }));
    writeFileSync(resolve(dataDir, "series.json"), JSON.stringify(seriesJson, null, "\t"), "utf-8");
    console.log(`  Wrote ${seriesJson.length} series to series.json`);
  }

  // Write people.json
  const peopleJson = people.map(p => ({ name: p.name, slug: p.slug }));
  writeFileSync(resolve(dataDir, "people.json"), JSON.stringify(peopleJson, null, "\t"), "utf-8");
  console.log(`  Wrote ${peopleJson.length} people to people.json`);

  console.log(`[${now()}] Regeneration complete.`);
}

main().catch((err) => {
  console.error("Regeneration failed:", err);
  process.exit(1);
});
