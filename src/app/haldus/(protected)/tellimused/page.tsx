import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { CreateOrderDialog } from "@/components/admin/CreateOrderDialog";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function OrdersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; totalMin?: string; totalMax?: string; dateFrom?: string; dateTo?: string }>;
}) {
  await requireAdminSession(["editor", "admin"]);

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const statusFilter = params.status ?? "";
  const totalMin = params.totalMin ?? "";
  const totalMax = params.totalMax ?? "";
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const perPage = 25;
  const from = (page - 1) * perPage;

  const db = createAdminClient();

  let builder = db.schema("commerce")
    .from("orders")
    .select("id,order_number,status,total,currency,created_at,customer_name", { count: "exact" });

  if (query) {
    builder = builder.ilike("customer_name", `%${query}%`);
  }

  if (statusFilter) {
    builder = builder.eq("status", statusFilter);
  }

  if (totalMin) {
    builder = builder.gte("total", Number(totalMin));
  }

  if (totalMax) {
    builder = builder.lte("total", Number(totalMax));
  }

  if (dateFrom) {
    builder = builder.gte("created_at", dateFrom);
  }

  if (dateTo) {
    builder = builder.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data, count } = await builder
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  const orders = (data ?? []) as Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    currency: string;
    created_at: string;
    customer_name: string;
  }>;

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / perPage);

  function buildHref(overrides: Record<string, string>) {
    const parts: string[] = [];
    const q = "q" in overrides ? overrides.q : query;
    const s = "status" in overrides ? overrides.status : statusFilter;
    const tmn = "totalMin" in overrides ? overrides.totalMin : totalMin;
    const tmx = "totalMax" in overrides ? overrides.totalMax : totalMax;
    const df = "dateFrom" in overrides ? overrides.dateFrom : dateFrom;
    const dt = "dateTo" in overrides ? overrides.dateTo : dateTo;
    const pg = overrides.page ?? String(page);

    if (q) parts.push(`q=${encodeURIComponent(q)}`);
    if (s) parts.push(`status=${encodeURIComponent(s)}`);
    if (tmn) parts.push(`totalMin=${encodeURIComponent(tmn)}`);
    if (tmx) parts.push(`totalMax=${encodeURIComponent(tmx)}`);
    if (df) parts.push(`dateFrom=${encodeURIComponent(df)}`);
    if (dt) parts.push(`dateTo=${encodeURIComponent(dt)}`);
    if (pg && Number(pg) > 1) parts.push(`page=${encodeURIComponent(pg)}`);

    return `/haldus/tellimused${parts.length ? "?" + parts.join("&") : ""}`;
  }

  function buildPageHref(p: number) {
    return buildHref(p === 1 ? { page: "1" } : { page: String(p) });
  }

  const hasActiveFilters = !!(query || statusFilter || totalMin || totalMax || dateFrom || dateTo);

  const queryParams: Record<string, string> = {};
  if (query) queryParams.q = query;
  if (statusFilter) queryParams.status = statusFilter;
  if (totalMin) queryParams.totalMin = totalMin;
  if (totalMax) queryParams.totalMax = totalMax;
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;

  return (
    <>
      <AdminPageHeader
        title="Tellimused"
        description={`${totalCount} tellimust. Maksed, täitmine ja erandite käsitlemine.`}
        action={<CreateOrderDialog />}
      />

      {/* Filter bar */}
      <form className="mb-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Otsi kliendi nime järgi…"
          className="flex-1 min-w-0 h-11 border border-line bg-paper px-4 outline-none text-sm"
        />
        <select name="status" defaultValue={statusFilter} className="h-11 border border-line bg-paper px-3 text-sm font-bold">
          <option value="">Kõik olekud</option>
          <option value="pending">Ootel</option>
          <option value="payment_pending">Makse ootel</option>
          <option value="paid">Makstud</option>
          <option value="processing">Töötlemisel</option>
          <option value="shipped">Saadetud</option>
          <option value="cancelled">Tühistatud</option>
          <option value="payment_failed">Makse ebaõnnestus</option>
          <option value="expired">Aegunud</option>
          <option value="manual_review">Käsitsi ülevaatus</option>
          <option value="refunded">Tagastatud</option>
          <option value="preorder">Ettetellimus</option>
        </select>
        <input
          type="number"
          name="totalMin"
          defaultValue={totalMin}
          placeholder="Kokku alates"
          step="0.01"
          min="0"
          className="w-32 h-11 border border-line bg-paper px-3 text-sm"
        />
        <input
          type="number"
          name="totalMax"
          defaultValue={totalMax}
          placeholder="Kokku kuni"
          step="0.01"
          min="0"
          className="w-32 h-11 border border-line bg-paper px-3 text-sm"
        />
        <input
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
          className="h-11 border border-line bg-paper px-3 text-sm"
          title="Alates kuupäevast"
        />
        <input
          type="date"
          name="dateTo"
          defaultValue={dateTo}
          className="h-11 border border-line bg-paper px-3 text-sm"
          title="Kuni kuupäevani"
        />
        <button type="submit" className="h-11 px-5 border border-line bg-soft text-sm font-bold hover:bg-line/30">
          Filtreeri
        </button>
        {hasActiveFilters && (
          <Link href="/haldus/tellimused" className="h-11 px-4 inline-flex items-center text-sm text-muted hover:text-ink font-bold">
            Tühista
          </Link>
        )}
      </form>

      <OrdersTable
        orders={orders}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        queryParams={queryParams}
      />
    </>
  );
}
