// Legacy cover migration: reads existing cover_image references, finds files under public/covers,
// processes and uploads them through the shared media service, updates database references.
// Usage: node scripts/migrate-covers.mjs [--preview] [--apply] [--from 10] [--limit 50]
//   --preview  Dry-run: report what would happen without mutations
//   --apply    Actually upload and update database
//   --from N   Skip first N products
//   --limit N  Process at most N products

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gqgliwbcazcixvyealsx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_DIR = join(process.cwd(), "public", "covers");
const BUCKET = "covers";
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1800;
const WEBP_QUALITY = 86;
const MAX_PIXELS = 40_000_000;

const args = process.argv.slice(2);
const PREVIEW = args.includes("--preview") || !args.includes("--apply");
const APPLY = args.includes("--apply");
const fromIdx = args.indexOf("--from");
const limitIdx = args.indexOf("--limit");
const SKIP = fromIdx >= 0 ? parseInt(args[fromIdx + 1], 10) || 0 : 0;
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || Infinity : Infinity;

if (APPLY && !SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const supabase = APPLY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  console.log(`${PREVIEW ? "PREVIEW" : "APPLY"} mode — legacy cover migration`);
  console.log(`Skip: ${SKIP}, Limit: ${LIMIT}`);

  const existingFiles = new Set();
  if (existsSync(PUBLIC_DIR)) {
    for (const file of readdirSync(PUBLIC_DIR)) {
      existingFiles.add(file.toLowerCase());
    }
  }
  console.log(`Files in public/covers: ${existingFiles.size}`);

  if (!supabase) {
    console.log("Using mock mode — no DB mutations");
  }

  const supabaseClient = supabase || createClient(SUPABASE_URL, "mock");

  const { data: products, error } = await supabaseClient
    .schema("commerce")
    .from("products")
    .select("id,sku,cover_image")
    .not("cover_image", "is", null)
    .order("sku");

  if (error) {
    console.error("Failed to fetch products:", error.message);
    process.exit(1);
  }

  const result = {
    total: products.length,
    processed: 0,
    matched: [],
    missing: [],
    ambiguous: [],
    failed: [],
    skipped: 0,
    newFormat: 0,
  };

  let count = 0;
  for (const product of products) {
    if (count < SKIP) { count++; result.skipped++; continue; }
    if (result.processed >= LIMIT) break;
    count++;

    const coverImage = product.cover_image;

    if (coverImage.startsWith("products/")) {
      result.newFormat++;
      continue;
    }

    const filename = basename(coverImage);
    const localPath = join(PUBLIC_DIR, filename);

    if (!existsSync(localPath)) {
      result.missing.push({ sku: product.sku, cover_image: coverImage });
      continue;
    }

    try {
      const source = readFileSync(localPath);
      const processed = await sharp(source, { limitInputPixels: MAX_PIXELS, failOn: "error" })
        .rotate()
        .resize({ width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT, fit: "inside", withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();

      const hash = sha256(processed);
      const objectKey = `products/${product.id}/${hash}.webp`;

      if (APPLY) {
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(objectKey, processed, {
            contentType: "image/webp",
            cacheControl: "public, max-age=31536000, immutable",
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { error: updateErr } = await supabase
          .schema("commerce")
          .from("products")
          .update({ cover_image: objectKey, updated_at: new Date().toISOString() })
          .eq("id", product.id);

        if (updateErr) throw updateErr;

        console.log(`  [OK] ${product.sku}: ${filename} → ${objectKey}`);
      } else {
        console.log(`  [PREVIEW] ${product.sku}: ${filename} → ${objectKey}`);
      }

      result.matched.push({
        sku: product.sku,
        before: filename,
        after: objectKey,
        hash,
      });
      result.processed++;
    } catch (err) {
      result.failed.push({
        sku: product.sku,
        cover_image: filename,
        error: err.message,
      });
      console.error(`  [FAIL] ${product.sku}: ${err.message}`);
    }
  }

  console.log("\n=== Migration Report ===");
  console.log(`Total products: ${result.total}`);
  console.log(`Already new format: ${result.newFormat}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Processed (matched): ${result.matched.length}`);
  console.log(`Missing files: ${result.missing.length}`);
  console.log(`Failed: ${result.failed.length}`);
  console.log(`Ambiguous: ${result.ambiguous.length}`);
  console.log(`Mode: ${PREVIEW ? "PREVIEW (no changes)" : "APPLIED"}`);
}

main().catch(console.error);
