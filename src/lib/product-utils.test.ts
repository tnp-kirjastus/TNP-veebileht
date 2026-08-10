import { describe, expect, it, vi } from "vitest";
import { isOnSale, getEffectivePrice, getSalePercent } from "./product-utils";
import type { Product } from "./data-types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "00000000-0000-4000-8000-000000000001",
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
    allow_preorder: true,
    cover_image: null,
    series_name: null,
    series_slug: null,
    categories: [],
    people: {},
    ...overrides,
  };
}

describe("soodushinna loogika", () => {
  it("tuvastab avatud tähtajaga sooduse", () => {
    expect(isOnSale(product())).toBe(true);
    expect(getEffectivePrice(product())).toBe(10);
    expect(getSalePercent(product())).toBe(50);
  });

  it("lükkab tagasi aegunud ja vigase akna", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00Z"));
    expect(isOnSale(product({ sale_end: "2026-01-01" }))).toBe(false);
    expect(isOnSale(product({ sale_start: "+046183-12-31" }))).toBe(false);
    vi.useRealTimers();
  });

  it("soodushind peab olema tavahinnast väiksem", () => {
    expect(isOnSale(product({ sale_price: 25 }))).toBe(false);
    expect(getEffectivePrice(product({ sale_price: 25 }))).toBe(20);
  });

  it("ilma soodushinnata pole soodust", () => {
    expect(isOnSale(product({ sale_price: null }))).toBe(false);
    expect(getSalePercent(product({ sale_price: null }))).toBe(0);
  });
});
