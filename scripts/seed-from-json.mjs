import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
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

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not set in environment");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dataDir = resolve(__dirname, "..", "src", "data");

function loadJson(filename) {
  return JSON.parse(readFileSync(resolve(dataDir, filename), "utf-8"));
}

async function seedCategories() {
  const categories = loadJson("categories.json");
  const unique = new Map();
  for (const c of categories) {
    if (!unique.has(c.slug)) unique.set(c.slug, c);
  }

  let inserted = 0;
  let idx = 0;
  for (const [, c] of unique) {
    const existing = await db.schema("content").from("categories").select("id").eq("slug", c.slug).maybeSingle();
    if (existing.data) continue;

    const { error } = await db.schema("content").from("categories").insert({
      name_et: c.name,
      slug: c.slug,
      sort_order: idx,
    });
    if (error) {
      console.error(`  FAIL category "${c.slug}": ${error.message}`);
    } else {
      inserted++;
    }
    idx++;
  }
  console.log(`  Categories: ${inserted} inserted (${unique.size - inserted} already existed)`);
}

async function seedSeries() {
  const series = loadJson("series.json");
  const unique = new Map();
  for (const s of series) {
    if (!unique.has(s.slug)) unique.set(s.slug, s);
  }

  let inserted = 0;
  for (const [, s] of unique) {
    const existing = await db.schema("content").from("series").select("id").eq("slug", s.slug).maybeSingle();
    if (existing.data) continue;

    const { error } = await db.schema("content").from("series").insert({
      name_et: s.name,
      slug: s.slug,
    });
    if (error) {
      console.error(`  FAIL series "${s.slug}": ${error.message}`);
    } else {
      inserted++;
    }
  }
  console.log(`  Series: ${inserted} inserted (${unique.size - inserted} already existed)`);
}

async function seedPeople() {
  const people = loadJson("people.json");
  const unique = new Map();
  for (const p of people) {
    if (!unique.has(p.slug)) unique.set(p.slug, p);
  }

  let inserted = 0;
  for (const [, p] of unique) {
    const existing = await db.schema("people").from("people").select("id").eq("slug", p.slug).maybeSingle();
    if (existing.data) continue;

    const { error } = await db.schema("people").from("people").insert({
      name: p.name,
      slug: p.slug,
    });
    if (error) {
      console.error(`  FAIL person "${p.slug}": ${error.message}`);
    } else {
      inserted++;
    }
  }
  console.log(`  People: ${inserted} inserted (${unique.size - inserted} already existed)`);
}

async function seedProducts() {
  const products = loadJson("products.json");

  const allCategories = await db.schema("content").from("categories").select("id,name_et");
  const catByName = new Map();
  if (allCategories.data) {
    for (const c of allCategories.data) {
      catByName.set(String(c.name_et).toLowerCase(), String(c.id));
    }
  }

  const allSeries = await db.schema("content").from("series").select("id,slug");
  const seriesBySlug = new Map();
  if (allSeries.data) {
    for (const s of allSeries.data) {
      seriesBySlug.set(String(s.slug), String(s.id));
    }
  }

  const allPeople = await db.schema("people").from("people").select("id,name");
  const peopleByName = new Map();
  if (allPeople.data) {
    for (const p of allPeople.data) {
      peopleByName.set(String(p.name), String(p.id));
    }
  }

  let inserted = 0;
  for (const p of products) {
    const existing = await db.schema("commerce").from("products").select("id").eq("sku", p.sku).maybeSingle();
    if (existing.data) continue;

    const seriesId = p.series_slug ? (seriesBySlug.get(p.series_slug) || null) : null;

    const { data: product, error } = await db.schema("commerce").from("products").insert({
      sku: p.sku,
      title_et: p.title_et,
      title_en: p.title_en || null,
      slug: p.slug,
      description_et: p.description_et || null,
      price: p.price || 0,
      sale_price: p.sale_price || null,
      sale_start: p.sale_start || null,
      sale_end: p.sale_end || null,
      stock: p.stock || 0,
      binding: p.binding || null,
      pages: p.pages || null,
      release_date: p.release_date || null,
      origin: p.origin === "estonian" ? "estonian" : "foreign",
      is_upcoming: p.is_upcoming || false,
      is_archived: p.is_archived || false,
      cover_image: p.cover_image || null,
      series_id: seriesId,
    }).select("id").single();

    if (error) {
      console.error(`  FAIL product "${p.sku}" (${p.title_et}): ${error.message}`);
      continue;
    }

    if (product && p.categories && p.categories.length > 0) {
      for (const catName of p.categories) {
        const catId = catByName.get(catName.toLowerCase());
        if (catId) {
          await db.schema("commerce").from("product_categories").insert({
            product_id: product.id,
            category_id: catId,
          }).select().maybeSingle();
        }
      }
    }

    if (product && p.people && Object.keys(p.people).length > 0) {
      for (const [role, names] of Object.entries(p.people)) {
        for (const name of names) {
          const personId = peopleByName.get(name);
          if (personId) {
            await db.schema("commerce").from("product_people").insert({
              product_id: product.id,
              person_id: personId,
              role,
            }).select().maybeSingle();
          }
        }
      }
    }

    inserted++;
    if (inserted % 200 === 0) console.log(`  ... ${inserted} products inserted`);
  }
  console.log(`  Products: ${inserted} inserted`);
}

async function main() {
  console.log("Seeding Supabase from JSON data...\n");

  console.log("1/4 Seeding categories...");
  await seedCategories();

  console.log("\n2/4 Seeding series...");
  await seedSeries();

  console.log("\n3/4 Seeding people...");
  await seedPeople();

  console.log("\n4/4 Seeding products (this may take a few minutes)...");
  await seedProducts();

  console.log("\nSeed complete!");
}

main().catch(console.error);
