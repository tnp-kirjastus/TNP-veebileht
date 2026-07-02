import { describe, expect, it, vi } from "vitest";
import {
  filterProductsByPerson,
  getActiveProducts,
  getCategories,
  getProductsByCategory,
  isOnSale,
  type Product,
} from "./data";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    sku: "9780000000001",
    title_et: "Test",
    title_en: null,
    slug: "test",
    description_et: null,
    price: 20,
    sale_price: 10,
    sale_start: null,
    sale_end: null,
    stock: 1,
    binding: null,
    pages: null,
    release_date: "2026-01-01",
    origin: "estonian",
    is_upcoming: false,
    is_archived: false,
    cover_image: null,
    series_name: null,
    series_slug: null,
    categories: [],
    people: {},
    ...overrides,
  };
}

describe("catalogue data invariants", () => {
  it("recognizes an open-ended active sale", () => {
    expect(isOnSale(product())).toBe(true);
  });

  it("rejects expired and malformed sale windows", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00Z"));
    expect(isOnSale(product({ sale_end: "2026-01-01" }))).toBe(false);
    expect(isOnSale(product({ sale_start: "+046183-12-31" }))).toBe(false);
    vi.useRealTimers();
  });

  it("maps category slugs to imported category names", () => {
    const categoryProduct = getActiveProducts().find((item) => item.categories.length > 0);
    expect(categoryProduct).toBeDefined();
    const category = categoryProduct!.categories[0];
    const slug = getCategories().find((item) => item.name === category)?.slug;
    expect(slug).toBeDefined();
    const byName = getProductsByCategory(category);
    const bySlug = getProductsByCategory(slug!);
    expect(bySlug.map((item) => item.id)).toEqual(byName.map((item) => item.id));
  });

  it("filters a person role by stable slug", () => {
    const authored = getActiveProducts().find((item) => item.people.author?.length);
    expect(authored).toBeDefined();
    const name = authored!.people.author[0];
    const matches = filterProductsByPerson(getActiveProducts(), "author", name);
    expect(matches.some((item) => item.id === authored!.id)).toBe(true);
  });

  it("contains no extended-year dates after repair", () => {
    const dates = getActiveProducts().flatMap((item) => [item.release_date, item.sale_start, item.sale_end]);
    expect(dates.some((value) => typeof value === "string" && /^\+\d{5,}/.test(value))).toBe(false);
  });
});
