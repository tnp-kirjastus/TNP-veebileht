import products from "@/data/products.json";
import categories from "@/data/categories.json";
import series from "@/data/series.json";
import people from "@/data/people.json";

export interface Product {
  id: number;
  sku: string;
  title_et: string;
  title_en: string | null;
  slug: string;
  description_et: string | null;
  price: number;
  sale_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  stock: number;
  binding: string | null;
  pages: number | null;
  release_date: string | null;
  origin: "estonian" | "foreign";
  is_upcoming: boolean;
  is_archived: boolean;
  cover_image: string | null;
  series_name: string | null;
  series_slug: string | null;
  categories: string[];
  people: Record<string, string[]>;
}

export interface Category {
  name: string;
  slug: string;
}

export interface Series {
  name: string;
  slug: string;
}

export interface Person {
  name: string;
  slug: string;
}

const allProducts = products as Product[];
const allCategories = categories as Category[];
const allSeries = series as Series[];
const allPeople = people as Person[];

const activeProducts = allProducts.filter((p) => !p.is_archived);

export function getActiveProducts(): Product[] {
  return activeProducts;
}

export function getArchivedProducts(): Product[] {
  return allProducts.filter((p) => p.is_archived);
}

export function getProductBySlug(slug: string): Product | undefined {
  return allProducts.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryName: string): Product[] {
  const category = allCategories.find((item) =>
    item.slug === categoryName || item.name.toLocaleLowerCase("et") === categoryName.toLocaleLowerCase("et")
  );
  const name = category?.name ?? categoryName;
  return activeProducts.filter((p) => p.categories.includes(name));
}

export function getProductsBySeries(seriesSlug: string): Product[] {
  return activeProducts.filter((p) => p.series_slug === seriesSlug);
}

export function getProductsByAuthor(authorName: string): Product[] {
  return activeProducts.filter(
    (p) => p.people.author?.some((a) => a === authorName)
  );
}

export function getProductsByPersonRole(role: string, personName: string): Product[] {
  return activeProducts.filter(
    (p) => p.people[role]?.some((n: string) => n === personName)
  );
}

export function getNewProducts(limit = 10): Product[] {
  return [...activeProducts]
    .filter((p) => p.release_date)
    .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""))
    .slice(0, limit);
}

export function getSaleProducts(): Product[] {
  return activeProducts.filter(isOnSale);
}

export function getUpcomingProducts(): Product[] {
  return activeProducts.filter((p) => p.is_upcoming);
}

export function getEstonianProducts(): Product[] {
  return activeProducts.filter((p) => p.origin === "estonian");
}

export function getForeignProducts(): Product[] {
  return activeProducts.filter((p) => p.origin === "foreign");
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return activeProducts.filter(
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

export function getEffectivePrice(p: Product): number {
  if (
    p.sale_price !== null &&
    (!p.sale_start || new Date(p.sale_start) <= new Date()) &&
    (!p.sale_end || new Date(p.sale_end) >= new Date())
  ) {
    return p.sale_price;
  }
  return p.price;
}

export function isOnSale(p: Product): boolean {
  const start = p.sale_start ? new Date(p.sale_start) : null;
  const end = p.sale_end ? new Date(p.sale_end) : null;
  return (
    p.sale_price !== null &&
    p.sale_price < p.price &&
    (!start || (!Number.isNaN(start.getTime()) && start <= new Date())) &&
    (!end || (!Number.isNaN(end.getTime()) && end >= new Date()))
  );
}

export function filterProductsByPerson(products: Product[], role: string, slugOrName: string): Product[] {
  const person = allPeople.find((item) => item.slug === slugOrName || item.name === slugOrName);
  const name = person?.name ?? slugOrName;
  return products.filter((product) => product.people[role]?.includes(name));
}

export function getSalePercent(p: Product): number {
  if (!isOnSale(p) || !p.sale_price || p.price === 0) return 0;
  return Math.round(((p.price - p.sale_price) / p.price) * 100);
}

export function getCategories(): Category[] {
  return allCategories;
}

export function getSeries(): Series[] {
  return allSeries;
}

export function getPeople(): Person[] {
  return allPeople;
}

export function getPersonByName(name: string): Person | undefined {
  return allPeople.find((p) => p.name === name);
}

export function getPersonBySlug(slug: string): Person | undefined {
  return allPeople.find((p) => p.slug === slug);
}

export function getSeriesBySlug(slug: string): Series | undefined {
  return allSeries.find((s) => s.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 5): Product[] {
  return activeProducts
    .filter((p) => {
      if (p.id === product.id) return false;
      const sharedCats = p.categories.filter((c) => product.categories.includes(c));
      return sharedCats.length > 0;
    })
    .slice(0, limit);
}

export function getSameSeriesProducts(product: Product, limit = 5): Product[] {
  if (!product.series_slug) return [];
  return activeProducts
    .filter((p) => p.id !== product.id && p.series_slug === product.series_slug)
    .slice(0, limit);
}

export function getSameAuthorProducts(product: Product, limit = 5): Product[] {
  const authors = product.people.author;
  if (!authors || authors.length === 0) return [];
  return activeProducts
    .filter((p) => p.id !== product.id && p.people.author?.some((a: string) => authors.includes(a)))
    .slice(0, limit);
}

export function formatEuro(value: number): string {
  return value.toFixed(2) + " €";
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("et-EE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
