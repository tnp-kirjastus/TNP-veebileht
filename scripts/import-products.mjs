/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SUPABASE_URL = "https://gqgliwbcazcixvyealsx.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", "products.json"), "utf-8"));

async function importProducts() {
  const batch = [];
  let count = 0;

  for (const p of products) {
    const coverImage = p.cover_image ? String(p.cover_image).replace(/^\/covers\//, "") : null;

    batch.push({
      sku: p.sku,
      title_et: p.title_et,
      title_en: p.title_en || null,
      slug: p.slug,
      description_et: p.description_et || null,
      price: p.price,
      sale_price: p.sale_price || null,
      sale_start: p.sale_start || null,
      sale_end: p.sale_end || null,
      stock: p.stock || 0,
      binding: p.binding || null,
      pages: p.pages || null,
      release_date: p.release_date || null,
      origin: p.origin || "estonian",
      is_upcoming: p.is_upcoming || false,
      is_archived: p.is_archived || false,
      cover_image: coverImage,
      series_name: p.series_name || null,
      series_slug: p.series_slug || null,
      categories: p.categories || [],
      people_data: p.people || {},
    });

    if (batch.length >= 50) {
      const { error } = await supabase.from("commerce_products_import").insert(batch);
      if (error) console.error("Batch error:", error.message);
      count += batch.length;
      console.log(`Imported ${count}/${products.length} products...`);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from("commerce_products_import").insert(batch);
    if (error) console.error("Final batch error:", error.message);
    count += batch.length;
  }

  console.log(`Done. ${count} products imported.`);
}

importProducts().catch(console.error);
