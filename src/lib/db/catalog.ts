import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product, Category, Series, Person } from "@/lib/data-types";

/**
 * Kataloogi päringukiht — AINUS koht, kust storefront kataloogiandmeid loeb.
 * Kõik päringud käivad otse Supabase'ist (view commerce.v_products +
 * RPC commerce.search_products), seega admini muudatused on kohe live'is.
 *
 * React cache() dedubliseerib päringud ühe renderdamise piires
 * (nt generateMetadata + page küsivad sama toodet).
 */

// ---------------------------------------------------------------------------
// View rida → Product DTO
// ---------------------------------------------------------------------------

interface VProductRow {
  id: string;
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
  origin: string;
  is_upcoming: boolean;
  is_archived: boolean;
  allow_preorder: boolean;
  cover_image: string | null;
  editions: unknown;
  effective_price: number;
  is_on_sale: boolean;
  series_name: string | null;
  series_slug: string | null;
  categories: unknown; // jsonb: string[]
  category_ids: string[];
  author_ids: string[];
  people: unknown; // jsonb: Record<string, string[]>
}

const CARD_COLUMNS =
  "id,sku,title_et,title_en,slug,price,sale_price,sale_start,sale_end,stock,binding,pages,release_date,origin,is_upcoming,is_archived,allow_preorder,cover_image,effective_price,is_on_sale,series_name,series_slug,categories,category_ids,author_ids,people";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toPeople(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [role, names] of Object.entries(value as Record<string, unknown>)) {
    out[role] = toStringArray(names);
  }
  return out;
}

function toEditions(value: unknown): { type: string; date: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const rec = e as Record<string, unknown>;
      if (typeof rec.type !== "string" || typeof rec.date !== "string") return null;
      return { type: rec.type, date: rec.date };
    })
    .filter((e): e is { type: string; date: string } => e !== null);
  return out.length ? out : undefined;
}

export function rowToProduct(r: VProductRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    title_et: r.title_et,
    title_en: r.title_en,
    slug: r.slug,
    description_et: r.description_et,
    price: r.price,
    sale_price: r.sale_price,
    sale_start: r.sale_start,
    sale_end: r.sale_end,
    stock: r.stock,
    binding: r.binding,
    pages: r.pages,
    release_date: r.release_date,
    origin: r.origin === "estonian" ? "estonian" : "foreign",
    is_upcoming: r.is_upcoming,
    is_archived: r.is_archived,
    allow_preorder: r.allow_preorder,
    cover_image: r.cover_image,
    series_name: r.series_name,
    series_slug: r.series_slug,
    categories: toStringArray(r.categories),
    people: toPeople(r.people),
    editions: toEditions(r.editions),
  };
}

// ---------------------------------------------------------------------------
// Sisemised abid
// ---------------------------------------------------------------------------

function productsTable() {
  return createAdminClient().schema("commerce").from("v_products");
}

async function fetchRowById(id: string): Promise<VProductRow | null> {
  const { data, error } = await productsTable()
    .select(`${CARD_COLUMNS},description_et,editions`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`fetchRowById: ${error.message}`);
  return data as unknown as VProductRow | null;
}

// ---------------------------------------------------------------------------
// Üksiktoode ja kaardiloendid
// ---------------------------------------------------------------------------

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { data, error } = await productsTable()
    .select(`${CARD_COLUMNS},description_et,editions`)
    .eq("slug", slug)
    .eq("is_archived", false)
    .maybeSingle();
  if (error) throw new Error(`getProductBySlug: ${error.message}`);
  return data ? rowToProduct(data as unknown as VProductRow) : null;
});

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .in("id", ids)
    .eq("is_archived", false);
  if (error) throw new Error(`getProductsByIds: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getNewProducts(limit = 10): Promise<Product[]> {
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .not("release_date", "is", null)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getNewProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getSaleProducts(): Promise<Product[]> {
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .eq("is_on_sale", true)
    .order("release_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`getSaleProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getUpcomingProducts(): Promise<Product[]> {
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .eq("is_upcoming", true)
    .order("release_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getUpcomingProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getActiveProducts(): Promise<Product[]> {
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .order("title_et", { ascending: true });
  if (error) throw new Error(`getActiveProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getArchivedProducts(): Promise<Product[]> {
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", true)
    .order("title_et", { ascending: true });
  if (error) throw new Error(`getArchivedProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

// ---------------------------------------------------------------------------
// Seotud tooted
// ---------------------------------------------------------------------------

export async function getSameSeriesProducts(product: Product, limit = 5): Promise<Product[]> {
  if (!product.series_slug) return [];
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .eq("series_slug", product.series_slug)
    .neq("id", product.id)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getSameSeriesProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getSameAuthorProducts(product: Product, limit = 5): Promise<Product[]> {
  const row = await fetchRowById(product.id);
  const authorIds = row?.author_ids ?? [];
  if (authorIds.length === 0) return [];
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .overlaps("author_ids", authorIds)
    .neq("id", product.id)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getSameAuthorProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

export async function getRelatedProducts(product: Product, limit = 5): Promise<Product[]> {
  const row = await fetchRowById(product.id);
  const categoryIds = row?.category_ids ?? [];
  if (categoryIds.length === 0) return [];
  const { data, error } = await productsTable()
    .select(CARD_COLUMNS)
    .eq("is_archived", false)
    .overlaps("category_ids", categoryIds)
    .neq("id", product.id)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`getRelatedProducts: ${error.message}`);
  return (data as unknown as VProductRow[]).map(rowToProduct);
}

// ---------------------------------------------------------------------------
// Otsing + filtreeritud loetelu (RPC commerce.search_products)
// ---------------------------------------------------------------------------

export interface CatalogueQuery {
  q?: string;
  categories?: string[];
  origin?: string;
  sale?: boolean;
  upcoming?: boolean;
  people?: Record<string, string>; // roll → nimi või slug
  saleStart?: string; // täpne kampaania-akna vaste
  saleEnd?: string;
  saleOpen?: boolean; // püsivalt soodsad
  scope?: "active" | "archived" | "all";
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface CatalogueResult {
  products: Product[];
  totalCount: number;
  page: number;
  totalPages: number;
}

interface SearchRpcRow {
  id: string;
  sku: string;
  title_et: string;
  slug: string;
  price: number;
  sale_price: number | null;
  effective_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  cover_image: string | null;
  is_upcoming: boolean;
  is_archived: boolean;
  stock: number;
  is_on_sale: boolean;
  release_date: string | null;
  origin: string;
  author_names: string | null;
}

function searchRowToProduct(r: SearchRpcRow): Product {
  return {
    id: r.id,
    sku: r.sku,
    title_et: r.title_et,
    title_en: null,
    slug: r.slug,
    description_et: null,
    price: r.price,
    sale_price: r.sale_price,
    sale_start: r.sale_start,
    sale_end: r.sale_end,
    stock: r.stock,
    binding: null,
    pages: null,
    release_date: r.release_date,
    origin: r.origin === "estonian" ? "estonian" : "foreign",
    is_upcoming: r.is_upcoming,
    is_archived: r.is_archived,
    allow_preorder: false,
    cover_image: r.cover_image,
    series_name: null,
    series_slug: null,
    categories: [],
    people: r.author_names ? { author: [r.author_names] } : {},
  };
}

export async function searchCatalogue(query: CatalogueQuery): Promise<CatalogueResult> {
  const db = createAdminClient();
  const args = {
    search_term: query.q ?? null,
    category_slugs: query.categories?.length ? query.categories : null,
    origin_filter: query.origin ?? null,
    sale_only: query.sale ?? false,
    upcoming_only: query.upcoming ?? false,
    person_filters: query.people && Object.keys(query.people).length ? query.people : null,
    sale_start: query.saleStart ?? null,
    sale_end: query.saleEnd ?? null,
    sale_open: query.saleOpen ?? false,
    scope: query.scope ?? "active",
    sort_by: query.sort ?? "newest",
    page_num: query.page ?? 1,
    page_size: query.pageSize ?? 24,
  };
  // "as never" — RPC signatuuri täpne tüüp tuleb pärast migratsiooni 034
  // rakendamist ja `npm run db:types` käivitamist; runtime on alati õige.
  const { data, error } = await db.schema("commerce").rpc("search_products", args as never);
  if (error) throw new Error(`searchCatalogue: ${error.message}`);
  const result = data as {
    products: SearchRpcRow[] | null;
    total_count: number;
    page: number;
    total_pages: number;
  };
  return {
    products: (result.products ?? []).map(searchRowToProduct),
    totalCount: result.total_count,
    page: result.page,
    totalPages: result.total_pages,
  };
}

// ---------------------------------------------------------------------------
// Taksonoomia: kategooriad, seeriad, inimesed
// ---------------------------------------------------------------------------

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await createAdminClient()
    .schema("commerce")
    .from("categories")
    .select("id,slug,name_et,parent_id,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`getCategories: ${error.message}`);
  const rows = (data ?? []) as { id: string; slug: string; name_et: string; parent_id: string | null }[];
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));
  return rows.map((r) => ({
    name: r.name_et,
    slug: r.slug,
    parent: r.parent_id ? slugById.get(r.parent_id) : undefined,
  }));
});

export const getCategoryTree = cache(async (): Promise<Category[]> => {
  const flat = await getCategories();
  const map = new Map<string, Category>();
  for (const c of flat) map.set(c.slug, { ...c, children: [] });
  const roots: Category[] = [];
  for (const c of flat) {
    const node = map.get(c.slug)!;
    if (c.parent && map.has(c.parent)) {
      map.get(c.parent)!.children!.push(node);
    } else if (!c.parent) {
      roots.push(node);
    }
  }
  return roots;
});

export const getSeries = cache(async (): Promise<Series[]> => {
  const { data, error } = await createAdminClient()
    .schema("content")
    .from("series")
    .select("slug,name_et")
    .order("name_et", { ascending: true });
  if (error) throw new Error(`getSeries: ${error.message}`);
  return ((data ?? []) as { slug: string; name_et: string }[]).map((s) => ({
    name: s.name_et,
    slug: s.slug,
  }));
});

export const getSeriesBySlug = cache(async (slug: string): Promise<Series | null> => {
  const { data, error } = await createAdminClient()
    .schema("content")
    .from("series")
    .select("slug,name_et")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getSeriesBySlug: ${error.message}`);
  return data ? { name: (data as { name_et: string }).name_et, slug: (data as { slug: string }).slug } : null;
});

export const getPeople = cache(async (): Promise<Person[]> => {
  const { data, error } = await createAdminClient()
    .schema("people")
    .from("people")
    .select("name,slug")
    .order("name", { ascending: true });
  if (error) throw new Error(`getPeople: ${error.message}`);
  return (data ?? []) as Person[];
});

export const getPersonBySlug = cache(async (slug: string): Promise<Person | null> => {
  const { data, error } = await createAdminClient()
    .schema("people")
    .from("people")
    .select("name,slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPersonBySlug: ${error.message}`);
  return (data as Person | null) ?? null;
});

export async function getPersonByName(name: string): Promise<Person | null> {
  const { data, error } = await createAdminClient()
    .schema("people")
    .from("people")
    .select("name,slug")
    .eq("name", name)
    .maybeSingle();
  if (error) throw new Error(`getPersonByName: ${error.message}`);
  return (data as Person | null) ?? null;
}
