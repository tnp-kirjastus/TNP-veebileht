import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Product, Category, Series, Person } from "./data-types";
import { isOnSale } from "./product-utils";
export { getEffectivePrice, isOnSale, getSalePercent, formatEuro, formatDate } from "./product-utils";
export type { Product, Category, Series, Person } from "./data-types";

let _cache: {
  products: Product[];
  categories: Category[];
  series: Series[];
  people: Person[];
  loadedAt: number;
} | null = null;

const CACHE_TTL_MS = 60_000;

function loadData() {
  const now = Date.now();
  if (_cache && now - _cache.loadedAt < CACHE_TTL_MS) return _cache;

  const dataDir = join(process.cwd(), "src", "data");
  _cache = {
    products: JSON.parse(readFileSync(join(dataDir, "products.json"), "utf-8")),
    categories: JSON.parse(readFileSync(join(dataDir, "categories.json"), "utf-8")),
    series: JSON.parse(readFileSync(join(dataDir, "series.json"), "utf-8")),
    people: JSON.parse(readFileSync(join(dataDir, "people.json"), "utf-8")),
    loadedAt: now,
  };
  return _cache;
}

export function clearDataCache() {
  _cache = null;
}

function allProducts(): Product[] {
  return loadData().products as Product[];
}

function allCategories(): Category[] {
  return loadData().categories as Category[];
}

function allSeries(): Series[] {
  return loadData().series as Series[];
}

function allPeople(): Person[] {
  return loadData().people as Person[];
}

const activeProducts = (): Product[] => allProducts().filter((p) => !p.is_archived);

export function getActiveProducts(): Product[] {
  return activeProducts();
}

export function getArchivedProducts(): Product[] {
  return allProducts().filter((p) => p.is_archived);
}

export function getProductBySlug(slug: string): Product | undefined {
  return allProducts().find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryName: string): Product[] {
  const category = allCategories().find((item) =>
    item.slug === categoryName || item.name.toLocaleLowerCase("et") === categoryName.toLocaleLowerCase("et")
  );
  const name = category?.name ?? categoryName;
  return activeProducts().filter((p) => p.categories.includes(name));
}

export function getProductsBySeries(seriesSlug: string): Product[] {
  return activeProducts().filter((p) => p.series_slug === seriesSlug);
}

export function getProductsByAuthor(authorName: string): Product[] {
  return activeProducts().filter(
    (p) => p.people.author?.some((a) => a === authorName)
  );
}

export function getProductsByPersonRole(role: string, personName: string): Product[] {
  return activeProducts().filter(
    (p) => p.people[role]?.some((n: string) => n === personName)
  );
}

export function getNewProducts(limit = 10): Product[] {
  return [...activeProducts()]
    .filter((p) => p.release_date)
    .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""))
    .slice(0, limit);
}

export function getSaleProducts(): Product[] {
  return activeProducts().filter(isOnSale);
}

export function getUpcomingProducts(): Product[] {
  return activeProducts().filter((p) => p.is_upcoming);
}

export function getEstonianProducts(): Product[] {
  return activeProducts().filter((p) => p.origin === "estonian");
}

export function getForeignProducts(): Product[] {
  return activeProducts().filter((p) => p.origin === "foreign");
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return activeProducts().filter(
    (p) =>
      p.title_et.toLowerCase().includes(q) ||
      p.sku.includes(q) ||
      (p.description_et || "").toLowerCase().includes(q) ||
      (p.series_name || "").toLowerCase().includes(q) ||
      p.categories.some((c) => c.toLowerCase().includes(q)) ||
      Object.values(p.people).some((names) =>
        names.some((n: string) => n.toLowerCase().includes(q))
      )
  );
}

export function filterProductsByPerson(products: Product[], role: string, slugOrName: string): Product[] {
  const person = allPeople().find((item) => item.slug === slugOrName || item.name === slugOrName);
  const name = person?.name ?? slugOrName;
  return products.filter((product) => product.people[role]?.includes(name));
}

export function getCategories(): Category[] {
  return allCategories();
}

export function getSeries(): Series[] {
  return allSeries();
}

export function getPeople(): Person[] {
  return allPeople();
}

export function getPersonByName(name: string): Person | undefined {
  return allPeople().find((p) => p.name === name);
}

export function getPersonBySlug(slug: string): Person | undefined {
  return allPeople().find((p) => p.slug === slug);
}

export function getSeriesBySlug(slug: string): Series | undefined {
  return allSeries().find((s) => s.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 5): Product[] {
  return activeProducts()
    .filter((p) => {
      if (p.id === product.id) return false;
      const sharedCats = p.categories.filter((c) => product.categories.includes(c));
      return sharedCats.length > 0;
    })
    .slice(0, limit);
}

export function getSameSeriesProducts(product: Product, limit = 5): Product[] {
  if (!product.series_slug) return [];
  return activeProducts()
    .filter((p) => p.id !== product.id && p.series_slug === product.series_slug)
    .slice(0, limit);
}

export function getSameAuthorProducts(product: Product, limit = 5): Product[] {
  const authors = product.people.author;
  if (!authors || authors.length === 0) return [];
  return activeProducts()
    .filter((p) => p.id !== product.id && p.people.author?.some((a: string) => authors.includes(a)))
    .slice(0, limit);
}
