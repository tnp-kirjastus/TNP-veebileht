import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../src/data/products.json", import.meta.url);
const products = JSON.parse(await readFile(target, "utf8"));
const epoch = Date.UTC(1899, 11, 30);
let repaired = 0;

function repair(value) {
  if (typeof value !== "string") return value;
  const match = value.match(/^\+(\d{5,})-12-31$/);
  if (!match) return value;
  const serial = Number(match[1]);
  if (!Number.isInteger(serial) || serial < 1 || serial > 109_575) return null;
  repaired += 1;
  return new Date(epoch + serial * 86_400_000).toISOString().slice(0, 10);
}

for (const product of products) {
  product.release_date = repair(product.release_date);
  product.sale_start = repair(product.sale_start);
  product.sale_end = repair(product.sale_end);
}

await writeFile(target, `${JSON.stringify(products, null, 2)}\n`, "utf8");
process.stdout.write(`Repaired ${repaired} generated dates.\n`);

