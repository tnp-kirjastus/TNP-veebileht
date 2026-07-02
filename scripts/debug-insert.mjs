import { readFileSync } from "fs";

const BASE = "https://gqgliwbcazcixvyealsx.supabase.co/rest/v1";
const KEY = "REDACTED_SERVICE_ROLE_KEY";
const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Content-Profile": "commerce", "Accept-Profile": "commerce", "Prefer": "return=minimal" };

const products = JSON.parse(readFileSync("src/data/products.json", "utf-8"));

const slugCount = {};
for (const p of products) slugCount[p.slug] = (slugCount[p.slug] || 0) + 1;

const slugIdx = {};

const batch = products.slice(100, 200);
const rows = batch.map((p, i) => {
  let slug = p.slug;
  if (slugCount[slug] > 1) {
    slugIdx[slug] = (slugIdx[slug] || 0) + 1;
    slug = `${slug}-${slugIdx[slug]}`;
  }
  const cover = p.cover_image ? String(p.cover_image).replace(/^\/covers\//, "") : null;
  return {
    sku: String(p.sku), title_et: p.title_et, slug,
    description_et: p.description_et || null,
    price: Number(p.price)||0, sale_price: p.sale_price?Number(p.sale_price):null,
    sale_start: p.sale_start||null, sale_end: p.sale_end||null,
    stock: Number(p.stock)||0, binding: p.binding||null, pages: p.pages?Number(p.pages):null,
    release_date: p.release_date||null, origin: p.origin||"estonian",
    is_upcoming: Boolean(p.is_upcoming), is_archived: Boolean(p.is_archived),
    cover_image: cover || null
  };
});

// Check for duplicate slugs within this batch
const slugs = rows.map(r => r.slug);
const dupSlugs = slugs.filter((s, idx) => slugs.indexOf(s) !== idx);
console.log("Duplicate slugs in batch:", dupSlugs.length, [...new Set(dupSlugs)]);
if (dupSlugs.length > 0) {
  dupSlugs.forEach(s => {
    const dups = rows.filter(r => r.slug === s);
    console.log(`  "${s}":`, dups.map(r => `${r.sku} (original: ${batch.find(bp => bp.sku === r.sku)?.slug})`));
  });
}

// Check if any slug contains "kaelkirjak"
const kael = rows.filter(r => r.slug.includes("kaelkirjak"));
console.log("kaelkirjak in batch:", kael.map(r => r.sku + ":" + r.slug));

// Try inserting the batch
async function main() {
  const r = await fetch(BASE + "/products", { method: "POST", headers: H, body: JSON.stringify(rows) });
  const txt = await r.text();
  console.log("Insert result:", r.status, txt.substring(0, 500));
}

main().catch(console.error);
