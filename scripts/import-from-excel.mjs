// Product import script for TNP webshop
// Reads raamatud.xlsx, imports into Supabase with image processing
// Usage: node scripts/import-from-excel.mjs [--preview]
// ISBN numbers are stored as-is (9789916171875) without slashes

import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREVIEW = process.argv.includes("--preview");

if (!PREVIEW && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const EXCEL_PATH = process.env.EXCEL_PATH || "D:/WORKS/TNP/Mockups-v5/raamatud.xlsx";
const MEDIA_PATH = process.env.MEDIA_PATH || "D:/WORKS/TNP/htdocs/tooted/meedia";

const supabase = PREVIEW ? null : createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(text) {
  const translit = {
    "õ": "o", "ä": "a", "ö": "o", "ü": "u",
    "š": "s", "ž": "z", "Õ": "O", "Ä": "A",
    "Ö": "O", "Ü": "U", "Š": "S", "Ž": "Z",
  };
  let result = String(text);
  for (const [from, to] of Object.entries(translit)) {
    result = result.replace(new RegExp(from, "g"), to);
  }
  return result
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const str = String(value).trim();
  if (str.includes("|")) {
    const candidates = str.split("|").map(parseDate).filter(Boolean);
    return candidates.at(-1) || null;
  }
  const european = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (european) {
    const [, day, month, year] = european;
    const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (candidate.getUTCFullYear() === Number(year) && candidate.getUTCMonth() === Number(month) - 1 && candidate.getUTCDate() === Number(day)) {
      return candidate.toISOString().split("T")[0];
    }
    return null;
  }
  const num = Number(str);
  // Excel serials must be handled before Date.parse: JavaScript interprets
  // strings such as "38865" as the year 38865 instead of an Excel date.
  if (Number.isFinite(num) && num > 0 && /^\d+(?:\.\d+)?$/.test(str)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const d = new Date(excelEpoch + Math.floor(num) * 86400000);
    return d.toISOString().split("T")[0];
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    if (year >= 1900 && year <= 2200) return parsed.toISOString().split("T")[0];
  }
  return null;
}

function parseMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

async function importRow(row) {
  const sku = String(row["SKU"] || "").trim();
  if (!sku) return { status: "skip", reason: "no sku" };

  const isArchived = String(row["Arhiiv"] || "").toLowerCase() === "x";
  const isEstonian = String(row["Eesti/Välismaa"] || "").toLowerCase().includes("eesti");
  const title = String(row["Title"] || "").trim();
  const slug = slugify(title);

  // Upsert series
  let seriesId = null;
  const seriesName = String(row["Toote Sari"] || "").trim();
  if (seriesName) {
    const seriesSlug = slugify(seriesName);
    const { data: s, error: sErr } = await supabase
      .schema("content")
      .from("series")
      .upsert({ slug: seriesSlug, name_et: seriesName }, { onConflict: "slug" })
      .select("id")
      .single();
    if (!sErr && s) seriesId = s.id;
  }

  // Upsert product
  const productData = {
    sku,
    title_et: title,
    slug,
    description_et: String(row["Content"] || "").trim() || null,
    price: parseMoney(row["Price"]) ?? 0,
    sale_price: parseMoney(row["Soodushind"]),
    sale_start: parseDate(row["Soodustuse algus"]),
    sale_end: parseDate(row["Soodustuse lõpp"]),
    stock: parseInt(row["Stock"]) || 0,
    binding: String(row["Toote Köide"] || "").trim() || null,
    pages: parseInt(row["Toote LK"]) || null,
    release_date: parseDate(row["Toote Ilmumiskuupäev"]),
    origin: isEstonian ? "estonian" : "foreign",
    is_archived: isArchived,
    series_id: seriesId,
  };

  const { data: product, error: pErr } = await supabase
    .schema("commerce")
    .from("products")
    .upsert(productData, { onConflict: "sku" })
    .select("id")
    .single();

  if (pErr || !product) {
    return { status: "error", sku, error: pErr?.message };
  }

  const productId = product.id;

  // Process people (authors, translators, designers, illustrators, editors)
  const peopleFields = [
    { field: "Toote Autor", role: "author" },
    { field: "Toote Disainer", role: "designer" },
    { field: "Toote Tõlk", role: "translator" },
    { field: "Toote Kujundaja", role: "designer" },
    { field: "Toote Illustreerija", role: "illustrator" },
    { field: "Toote Toimetaja", role: "editor" },
  ];

  for (const { field, role } of peopleFields) {
    const raw = String(row[field] || "").trim();
    if (!raw) continue;

    const names = raw.split("|").map((s) => s.trim()).filter(Boolean);

    for (const name of names) {
      const personSlug = slugify(name);
      const { data: person } = await supabase
        .schema("people")
        .from("people")
        .upsert({ slug: personSlug, name }, { onConflict: "slug" })
        .select("id")
        .single();

      if (person) {
        await supabase.schema("commerce").from("product_people").upsert({
          product_id: productId,
          person_id: person.id,
          role,
        }, { onConflict: "product_id,person_id,role" });
      }
    }
  }

  // Process categories
  const catRaw = String(row["Tootekategooriad"] || "").trim();
  if (catRaw) {
    const catNames = catRaw.split("|").map((s) => s.trim()).filter(Boolean);
    for (const name of catNames) {
      const { data: cat } = await supabase
        .schema("commerce")
        .from("categories")
        .select("id")
        .eq("name_et", name)
        .single();

      if (cat) {
        await supabase.schema("commerce").from("product_categories").upsert({
          product_id: productId,
          category_id: cat.id,
        }, { onConflict: "product_id,category_id" });
      }
    }
  }

  // Process cover image
  const localPath = join(MEDIA_PATH, `${sku}.jpg`);
  if (existsSync(localPath)) {
    try {
      const source = readFileSync(localPath);
      const buffer = await sharp(source, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1200, height: 1800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
      await supabase.storage.from("covers").upload(`${sku}.webp`, buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
      await supabase.schema("commerce").from("products")
        .update({ cover_image: `${sku}.webp` })
        .eq("id", productId);
    } catch (e) {
      console.warn(`  Image upload failed for ${sku}: ${e.message}`);
    }
  }

  return { status: "ok", sku, isArchived };
}

function validateRow(row) {
  const sku = String(row["SKU"] || "").trim();
  if (!sku) return { status: "skip", reason: "no sku" };
  const title = String(row["Title"] || "").trim();
  const archived = String(row["Arhiiv"] || "").toLowerCase() === "x";
  const price = parseMoney(row["Price"]);
  const dates = ["Soodustuse algus", "Soodustuse lõpp", "Toote Ilmumiskuupäev"];
  const invalidDates = dates.filter((field) => row[field] && !parseDate(row[field]));
  if (!title || (!archived && price === null) || invalidDates.length) {
    return { status: "error", sku, error: `invalid ${!title ? "title" : !archived && price === null ? "price" : invalidDates.join(", ")}` };
  }
  return { status: "ok", sku, isArchived: archived };
}

async function main() {
  console.log("Reading Excel:", EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`Total rows: ${rows.length}`);
  if (PREVIEW) console.log("Preview mode: no database or storage changes will be made.");

  let ok = 0;
  let archived = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const result = PREVIEW ? validateRow(row) : await importRow(row);

    if (result.status === "ok") {
      ok++;
      if (result.isArchived) archived++;
    } else if (result.status === "skip") {
      skipped++;
    } else {
      errors++;
      if (errors <= 50) console.error(`  Error at row ${i + 1}:`, result.error);
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${rows.length} (${ok} ok, ${archived} archived, ${errors} errors, ${skipped} skipped)`);
    }
  }

  console.log(`\n${PREVIEW ? "Preview complete" : "Import complete"}:`);
  console.log(`  Total: ${rows.length}`);
  console.log(`  Active: ${ok - archived}`);
  console.log(`  Archived (Läbimüüdud): ${archived}`);
  console.log(`  Errors: ${errors}`);
  if (errors > 50) console.log(`  Diagnostics shown: first 50 of ${errors} errors`);
  console.log(`  Skipped: ${skipped}`);
}

main().catch(console.error);
