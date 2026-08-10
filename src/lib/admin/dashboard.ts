import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCoverUrl } from "@/lib/media-url";

/** Päeva algus Europe/Tallinn ajavööndis (EET/EEST-teadlik). */
export function tallinnMidnight(daysAgo = 0): Date {
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Tallinn" });
  const [y, m, d] = dayFmt.format(new Date()).split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d - daysAgo, 0, 0, 0);
  const fullFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Tallinn", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = fullFmt.formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return new Date(guess - (asUtc - guess));
}

/** Staatused, kus raha on laekunud (müük). */
const REVENUE_STATUSES = ["paid", "processing", "shipped", "delivered"];
const PENDING_STATUSES = ["pending", "payment_pending", "manual_review"];

export const LOW_STOCK_THRESHOLD = 5;

export interface DashboardOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
}

export interface LowStockProduct {
  id: string;
  sku: string;
  title: string;
  stock: number;
  coverUrl: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

export interface SalesBucket {
  orders: number;
  revenue: number;
}

export interface DashboardData {
  sales: { today: SalesBucket; week: SalesBucket; month: SalesBucket };
  pendingOrders: number;
  recentOrders: DashboardOrder[];
  activeProducts: number;
  upcomingProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: LowStockProduct[];
  publishedPosts: number;
  draftPosts: number;
  activeCampaigns: number;
  auditEntries: AuditEntry[];
}

function settledCount(result: PromiseSettledResult<unknown>): number {
  if (result.status !== "fulfilled") return 0;
  const v = result.value as { count?: number } | null;
  return typeof v?.count === "number" ? v.count : 0;
}

function settledRows<T>(result: PromiseSettledResult<unknown>): T[] {
  if (result.status !== "fulfilled") return [];
  const v = result.value as { data?: unknown } | null;
  return Array.isArray(v?.data) ? (v.data as T[]) : [];
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = createAdminClient();

  const monthStart = tallinnMidnight(29); // täna + 29 eelmist päeva = 30 päeva
  const todayStart = tallinnMidnight(0).getTime();
  const weekStart = tallinnMidnight(6).getTime(); // täna + 6 eelmist päeva = 7 päeva

  const results = await Promise.allSettled([
    db.schema("commerce").from("orders")
      .select("id,order_number,status,total,customer_name,created_at")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false }),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_upcoming", true).eq("is_archived", false),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true })
      .eq("is_archived", false).lte("stock", LOW_STOCK_THRESHOLD).gt("stock", 0),
    db.schema("commerce").from("products").select("id", { count: "exact", head: true }).eq("is_archived", false).eq("stock", 0),
    db.schema("commerce").from("products").select("id,sku,title_et,stock,cover_image")
      .eq("is_archived", false).lte("stock", LOW_STOCK_THRESHOLD).gt("stock", 0)
      .order("stock", { ascending: true }).order("title_et", { ascending: true }).limit(8),
    db.schema("content").from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    db.schema("content").from("posts").select("id", { count: "exact", head: true }).eq("is_published", false),
    db.schema("content").from("campaigns").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.schema("system").from("audit_log").select("id,action,resource_type,resource_id,created_at")
      .order("created_at", { ascending: false }).limit(10),
  ]);

  interface OrderRow { id: string; order_number: string; status: string; total: number | string | null; customer_name: string | null; created_at: string; }
  const orderRows = settledRows<OrderRow>(results[0]);
  const orders: DashboardOrder[] = orderRows.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    total: Number(o.total ?? 0),
    customer_name: o.customer_name ?? "",
    created_at: o.created_at,
  }));

  function bucket(fromMs: number): SalesBucket {
    const inWindow = orders.filter((o) => new Date(o.created_at).getTime() >= fromMs);
    return {
      orders: inWindow.length,
      revenue: inWindow.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((sum, o) => sum + o.total, 0),
    };
  }

  const lowStockProducts = settledRows<{ id: string; sku: string | null; title_et: string | null; stock: number | null; cover_image: string | null }>(results[5])
    .map<LowStockProduct>((p) => ({
      id: p.id,
      sku: p.sku ?? "",
      title: p.title_et ?? "",
      stock: Number(p.stock ?? 0),
      coverUrl: getCoverUrl(p.cover_image),
    }));

  return {
    sales: { today: bucket(todayStart), week: bucket(weekStart), month: bucket(monthStart.getTime()) },
    pendingOrders: orders.filter((o) => PENDING_STATUSES.includes(o.status)).length,
    recentOrders: orders.slice(0, 7),
    activeProducts: settledCount(results[1]),
    upcomingProducts: settledCount(results[2]),
    lowStockCount: settledCount(results[3]),
    outOfStockCount: settledCount(results[4]),
    lowStockProducts,
    publishedPosts: settledCount(results[6]),
    draftPosts: settledCount(results[7]),
    activeCampaigns: settledCount(results[8]),
    auditEntries: settledRows<AuditEntry>(results[9]),
  };
}
