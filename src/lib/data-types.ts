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
  allow_preorder: boolean;
  cover_image: string | null;
  series_name: string | null;
  series_slug: string | null;
  categories: string[];
  people: Record<string, string[]>;
  editions?: { type: string; date: string }[];
  latest_release_date?: string;
}

export interface Category {
  name: string;
  slug: string;
  parent?: string;
  children?: Category[];
}

export interface Series {
  name: string;
  slug: string;
}

export interface Person {
  name: string;
  slug: string;
}
