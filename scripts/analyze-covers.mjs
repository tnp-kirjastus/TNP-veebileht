// Analyzes cover image dimensions: distribution + worst offenders.
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "public/covers";
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
console.log(`Total cover files: ${files.length}`);

const buckets = { tiny_lt300: 0, small_300_499: 0, medium_500_799: 0, ok_800_1199: 0, large_gte1200: 0 };
const worst = [];
const ratios = new Map();

for (const f of files) {
  try {
    const meta = await sharp(join(dir, f)).metadata();
    const w = meta.width ?? 0, h = meta.height ?? 0;
    const shortSide = Math.min(w, h);
    if (shortSide < 300) buckets.tiny_lt300++;
    else if (shortSide < 500) buckets.small_300_499++;
    else if (shortSide < 800) buckets.medium_500_799++;
    else if (shortSide < 1200) buckets.ok_800_1199++;
    else buckets.large_gte1200++;
    const ratio = h > 0 ? (w / h).toFixed(2) : "?";
    ratios.set(ratio, (ratios.get(ratio) ?? 0) + 1);
    if (shortSide < 500) worst.push({ f, w, h });
  } catch { /* unreadable */ }
}

console.log("Size buckets (by short side):", JSON.stringify(buckets, null, 1));
console.log("\nWorst (<500px short side), first 25:");
worst.sort((a, b) => a.w - b.w).slice(0, 25).forEach((x) => console.log(`  ${x.f}: ${x.w}x${x.h}`));
console.log("\nTop aspect ratios (w/h):");
[...ratios.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([r, n]) => console.log(`  ${r}: ${n} files`));
