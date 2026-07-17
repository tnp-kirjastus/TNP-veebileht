import { readFileSync } from "fs";

const BASE = "https://gqgliwbcazcixvyealsx.supabase.co/rest/v1";
<<<<<<< HEAD
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}
=======
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZ2xpd2JjYXpjaXh2eWVhbHN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk5Mzc0NSwiZXhwIjoyMDk4NTY5NzQ1fQ.uGmndg0PZ4CThNRYbiqwBrN9CpWkprzX71BJ8G_ljMo";
>>>>>>> f6f908b09423191058bfebcab71fda76084816dc

function slugify(text) {
  const t = { "õ": "o", "ä": "a", "ö": "o", "ü": "u", "š": "s", "ž": "z", "Õ": "O", "Ä": "A", "Ö": "O", "Ü": "U", "Š": "S", "Ž": "Z" };
  let r = String(text);
  for (const [k, v] of Object.entries(t)) r = r.replace(new RegExp(k, "g"), v);
  return r.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function apiGet(schema, table, params = "") {
  const h = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Profile": schema, "Accept-Profile": schema };
  const r = await fetch(`${BASE}/${table}?${params}`, { headers: h });
  return r.json();
}

async function apiUpsert(schema, table, rows, onConflict) {
  const h = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema, "Prefer": "resolution=merge-duplicates" };
  const p = onConflict ? `?on_conflict=${onConflict}` : "";
  const r = await fetch(`${BASE}/${table}${p}`, { method: "POST", headers: h, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
}

async function apiInsertOne(schema, table, row) {
  const h = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema, "Prefer": "return=minimal" };
  const r = await fetch(`${BASE}/${table}`, { method: "POST", headers: h, body: JSON.stringify(row) });
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r;
}

async function main() {
  const products = JSON.parse(readFileSync("src/data/products.json", "utf-8"));
  const seriesJson = JSON.parse(readFileSync("src/data/series.json", "utf-8"));
  const peopleJson = JSON.parse(readFileSync("src/data/people.json", "utf-8"));

  console.log(`Products: ${products.length}, Series: ${seriesJson.length}, People: ${peopleJson.length}`);

  // Import series
  console.log("Importing series...");
  await apiUpsert("content", "series", seriesJson.map(s => ({ slug: s.slug, name_et: s.name })), "slug");
  const sdata = await apiGet("content", "series", "select=slug,id&limit=200");
  const seriesMap = {};
  for (const s of sdata) seriesMap[s.slug] = s.id;
  console.log(`  ${Object.keys(seriesMap).length} series`);

  // Import people
  console.log("Importing people...");
  const pplSeen = new Set();
  const pplUnique = [];
  for (const p of peopleJson) {
    const s = slugify(p.name);
    if (!pplSeen.has(s)) { pplSeen.add(s); pplUnique.push({ slug: s, name: p.name }); }
  }
  for (let i = 0; i < pplUnique.length; i += 500) {
    await apiUpsert("people", "people", pplUnique.slice(i, i + 500), "slug");
    process.stdout.write(`\r  ${Math.min(i+500, pplUnique.length)}/${pplUnique.length} people`);
  }
  const pdata = await apiGet("people", "people", "select=slug,id&limit=5000");
  const peopleMap = {};
  for (const p of pdata) peopleMap[p.slug] = p.id;
  console.log(`\n  ${Object.keys(peopleMap).length} people`);

  // Category map
  const cdata = await apiGet("commerce", "categories", "select=name_et,id");
  const categoryMap = {};
  for (const c of cdata) categoryMap[c.name_et] = c.id;

  // Slug dedup
  const slugCount = {};
  for (const p of products) slugCount[p.slug] = (slugCount[p.slug] || 0) + 1;
  const slugIdx = {};

  // Import products ONE AT A TIME
  console.log("Importing products one at a time...");
  let ok = 0, errs = 0;
  const productIds = {};

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      let slug = p.slug;
      if (slugCount[slug] > 1) {
        slugIdx[slug] = (slugIdx[slug] || 0) + 1;
        slug = `${slug}-${slugIdx[slug]}`;
      }
      const cover = p.cover_image ? String(p.cover_image).replace(/^\/covers\//, "") : null;

      const { data } = await (await fetch(`${BASE}/products?on_conflict=sku`, {
        method: "POST",
        headers: {
          "apikey": KEY, "Authorization": `Bearer ${KEY}`,
          "Content-Type": "application/json", "Content-Profile": "commerce", "Accept-Profile": "commerce",
          "Prefer": "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
          sku: String(p.sku), title_et: p.title_et, title_en: p.title_en || null,
          slug, description_et: p.description_et || null,
          price: Number(p.price)||0, sale_price: p.sale_price?Number(p.sale_price):null,
          sale_start: p.sale_start||null, sale_end: p.sale_end||null,
          stock: Number(p.stock)||0, binding: p.binding||null, pages: p.pages?Number(p.pages):null,
          release_date: p.release_date||null, origin: p.origin||"estonian",
          is_upcoming: Boolean(p.is_upcoming), is_archived: Boolean(p.is_archived),
          cover_image: cover || null,
          series_id: p.series_slug ? seriesMap[p.series_slug] || null : null,
        })
      })).json();

      if (Array.isArray(data) && data[0]) productIds[p.sku] = data[0].id;
      ok++;
    } catch (e) {
      errs++;
      if (errs <= 5) console.error(`  Error at ${p.sku}: ${e.message}`);
      // Try again without series_id
      try {
        let slug = p.slug;
        if (slugCount[slug] > 1) {
          slugIdx[slug] = (slugIdx[slug] || 0) + 1;
          slug = `${slug}-${slugIdx[slug]}`;
        }
        await apiInsertOne("commerce", "products", {
          sku: String(p.sku), title_et: p.title_et, slug,
          price: Number(p.price)||0, stock: Number(p.stock)||0,
          origin: p.origin||"estonian", is_upcoming: Boolean(p.is_upcoming), is_archived: Boolean(p.is_archived),
        });
        ok++; errs--;
      } catch (e2) {
        if (errs <= 5) console.error(`  Retry failed for ${p.sku}: ${e2.message}`);
      }
    }
    if ((i + 1) % 200 === 0) console.log(`  ${i+1}/${products.length} (${ok} ok, ${errs} errors)`);
  }
  console.log(`Products: ${ok} inserted, ${errs} errors`);

  // Link categories
  console.log("Linking categories...");
  const pcBatch = [];
  for (const p of products) {
    if (!p.categories || !productIds[p.sku]) continue;
    for (const catName of p.categories) {
      const cid = categoryMap[catName];
      if (cid) pcBatch.push({ product_id: productIds[p.sku], category_id: cid });
    }
  }
  for (let i = 0; i < pcBatch.length; i += 500) {
    await apiUpsert("commerce", "product_categories", pcBatch.slice(i, i + 500), "product_id,category_id");
  }
  console.log(`  ${pcBatch.length} category links`);

  // Link people
  console.log("Linking people...");
  const ppBatch = [];
  const ppSeen = new Set();
  for (const p of products) {
    if (!p.people || !productIds[p.sku]) continue;
    for (const [role, names] of Object.entries(p.people)) {
      const vr = ["author","translator","designer","illustrator","editor"].includes(role) ? role : null;
      if (!vr) continue;
      for (const name of names) {
        const pid = peopleMap[slugify(name)];
        const key = `${productIds[p.sku]}:${pid}:${vr}`;
        if (pid && !ppSeen.has(key)) {
          ppSeen.add(key);
          ppBatch.push({ product_id: productIds[p.sku], person_id: pid, role: vr });
        }
      }
    }
  }
  for (let i = 0; i < ppBatch.length; i += 500) {
    await apiUpsert("commerce", "product_people", ppBatch.slice(i, i + 500), "product_id,person_id,role");
  }
  console.log(`  ${ppBatch.length} people links`);
  console.log("\nAll done!");
}

main().catch(console.error);
