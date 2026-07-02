// Match missing catalogue covers against the complete TNP workspace by ISBN.
// Usage: node scripts/match-cover-images.mjs [--apply]

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, basename, join, relative } from "node:path";
import sharp from "sharp";
import XLSX from "xlsx";

const ROOT = "D:/WORKS/TNP";
const PRODUCTS_PATH = join(ROOT, "tnp-store/src/data/products.json");
const OUTPUT_DIR = join(ROOT, "tnp-store/public/covers");
const REPORT_PATH = join(ROOT, "tnp-store/scripts/cover-match-report.json");
const EXCEL_PATH = join(ROOT, "Mockups-v5/raamatud.xlsx");
const APPLY = process.argv.includes("--apply");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "public"]);

function isbn10To13(value) {
  if (!/^\d{9}[\dX]$/i.test(value)) return null;
  const first = `978${value.slice(0, 9)}`;
  const sum = [...first].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${first}${(10 - (sum % 10)) % 10}`;
}

async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath, output);
    else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) output.push(fullPath);
  }
  return output;
}

function candidateScore(path, isbn, metadata) {
  const name = basename(path, extname(path)).toLowerCase();
  let score = 0;
  if (name === isbn.toLowerCase()) score += 100_000;
  else if (name.startsWith(isbn.toLowerCase())) score += 50_000;
  else score += 10_000;
  if (/[-_](?:\d{2,4})x\d{2,4}|thumbnail|thumb|scaled|small|vaike/i.test(name)) score -= 20_000;
  const width = metadata.width ?? 0, height = metadata.height ?? 0;
  score += Math.min(width * height, 20_000_000) / 1000;
  if (height > width) score += 5_000;
  if (width < 300 || height < 400) score -= 10_000;
  return score;
}

function canonicalMediaName(value) {
  let filename = String(value ?? "").split(/[?#]/)[0].split("/").pop() ?? "";
  try { filename = decodeURIComponent(filename); } catch {}
  return basename(filename, extname(filename)).toLocaleLowerCase("et")
    .replace(/-(?:\d{2,4})x\d{2,4}$/i, "").replace(/-scaled$/i, "");
}

const products = JSON.parse(await readFile(PRODUCTS_PATH, "utf8"));
const missing = products.filter((product) => !product.cover_image);
const aliases = new Map();
for (const product of missing) {
  const sku = String(product.sku).replace(/[^0-9X]/gi, "").toUpperCase();
  if (!sku) continue;
  aliases.set(sku, product.sku);
  const isbn13 = isbn10To13(sku);
  if (isbn13) aliases.set(isbn13, product.sku);
}

const workbook = XLSX.readFile(EXCEL_PATH);
const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
const mediaNames = new Map();
for (const row of excelRows) {
  const sku = String(row.SKU ?? "").trim();
  if (!missing.some((product) => product.sku === sku)) continue;
  for (const value of [row.Pilt, row["Toote Kaanepilt"]]) {
    const name = canonicalMediaName(value);
    if (name) {
      const skuSet = mediaNames.get(name) ?? new Set();
      skuSet.add(sku);
      mediaNames.set(name, skuSet);
    }
  }
}

const files = await walk(ROOT);
const candidates = new Map();
for (const path of files) {
  const normalizedName = basename(path).replace(/[^0-9X]/gi, "").toUpperCase();
  const mediaSkus = mediaNames.get(canonicalMediaName(path));
  if (mediaSkus) {
    for (const mediaSku of mediaSkus) {
      const list = candidates.get(mediaSku) ?? [];
      list.push({ path, alias: canonicalMediaName(path) });
      candidates.set(mediaSku, list);
    }
  }
  for (const [alias, sku] of aliases) {
    if (!normalizedName.includes(alias)) continue;
    const list = candidates.get(sku) ?? [];
    if (!list.some((item) => item.path === path)) list.push({ path, alias });
    candidates.set(sku, list);
  }
}

const matches = [];
for (const product of missing) {
  const options = candidates.get(product.sku) ?? [];
  const ranked = [];
  for (const option of options) {
    const metadata = await sharp(option.path, { limitInputPixels: 80_000_000 }).metadata().catch(() => ({}));
    ranked.push({ ...option, width: metadata.width ?? null, height: metadata.height ?? null, score: candidateScore(option.path, option.alias, metadata) });
  }
  ranked.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  if (ranked[0]) matches.push({ sku: product.sku, title: product.title_et, archived: product.is_archived, selected: ranked[0], candidateCount: ranked.length });
}

if (APPLY) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const bySku = new Map(products.map((product) => [product.sku, product]));
  for (const match of matches) {
    const filename = `${String(match.sku).replace(/[^0-9X-]/gi, "-")}.webp`;
    await sharp(match.selected.path, { limitInputPixels: 80_000_000 })
      .rotate().resize({ width: 1200, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 }).toFile(join(OUTPUT_DIR, filename));
    bySku.get(match.sku).cover_image = filename;
  }
  await writeFile(PRODUCTS_PATH, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

const report = {
  generatedAt: new Date().toISOString(), applied: APPLY, scannedImages: files.length,
  products: products.length, missingBefore: missing.length, matched: matches.length,
  activeMatched: matches.filter((item) => !item.archived).length,
  archivedMatched: matches.filter((item) => item.archived).length,
  unmatched: missing.filter((product) => !candidates.has(product.sku)).map(({ sku, title_et, is_archived }) => ({ sku, title: title_et, archived: is_archived })),
  matches: matches.map((match) => ({ ...match, selected: { ...match.selected, path: relative(ROOT, match.selected.path) } })),
};
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ applied: APPLY, scannedImages: files.length, missingBefore: missing.length, matched: matches.length, activeMatched: report.activeMatched, archivedMatched: report.archivedMatched, unmatched: report.unmatched.length }, null, 2));
