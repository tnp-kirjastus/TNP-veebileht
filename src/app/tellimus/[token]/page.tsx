import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOrderToken, type OrderSnapshot } from "@/lib/order-session";

export const metadata: Metadata = { title: "Tellimuse kinnitus", robots: { index: false, follow: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let snapshot: OrderSnapshot | null = null;
  let status: string = "payment_pending";
  let orderNumber: string = "";
  let total: number = 0;

  if (token === "local") {
    try {
      const cookieStore = await cookies();
      const raw = cookieStore.get("tnp_order")?.value;
      if (raw) {
        const parsed = await verifyOrderToken(raw);
        if (parsed) {
          snapshot = parsed;
          status = "paid";
          orderNumber = parsed.orderNumber;
          total = parsed.total;
        }
      }
    } catch { notFound(); }
  } else if (/^[a-f0-9]{64}$/i.test(token)) {
    try {
      const db = createAdminClient();
      const { data } = await db.schema("commerce").rpc("get_order_by_token", { p_token: token });
      const order = Array.isArray(data) ? data[0] : data;
      if (order) {
        orderNumber = order.order_number;
        status = order.status;
        total = Number(order.total);
      }
    } catch { /* Supabase unavailable, try cookie fallback */ }
    if (!orderNumber) {
      try {
        const cookieStore = await cookies();
        const raw = cookieStore.get("tnp_order")?.value;
        if (raw) {
          const parsed = await verifyOrderToken(raw);
          if (parsed) {
            snapshot = parsed;
            status = "paid";
            orderNumber = parsed.orderNumber;
            total = parsed.total;
          }
        }
      } catch { notFound(); }
    }
  } else {
    notFound();
  }

  if (!snapshot && !orderNumber) notFound();

  const labels: Record<string, string> = {
    payment_pending: "Makse on ootel",
    paid: "Makse õnnestus",
    processing: "Tellimus on töös",
    shipped: "Tellimus on teele pandud",
    cancelled: "Tellimus tühistati",
    expired: "Makse aegus",
    manual_review: "Tellimus vajab kontrollimist",
  };

  const label = labels[status] ?? "Tellimus vastu võetud";
  const success = status === "paid";

  return (
    <LayoutContained>
      <section className="py-[50px] border-b border-line">
        <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Tellimuse kinnitus" }]} />
      </section>

      <section className="py-16 max-w-3xl">
        <div className="text-center">
          {success && (
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-leaf/10 grid place-items-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
          )}
          <p className="text-sm font-bold text-accent uppercase tracking-wide">Tellimus {orderNumber}</p>
          <h1 className="font-heading text-[clamp(42px,7vw,68px)] leading-[1.05] mt-4">{label}</h1>
          <p className="text-muted mt-5 text-lg">
            Kokku <strong className="text-ink">{total.toFixed(2)} €</strong>
          </p>
          <p className="text-muted mt-2">
            {success ? "Saadame tellimuse kinnituse ja järgmised sammud e-postiga." : "Võtame sinuga peagi ühendust."}
          </p>
        </div>

        {snapshot && (
          <div className="mt-12 border border-line divide-y divide-line">
            <div className="p-5 bg-soft">
              <h2 className="font-heading text-xl">Tellimuse andmed</h2>
            </div>
            <div className="p-5">
              <h3 className="font-extrabold text-sm uppercase text-muted tracking-[0.04em]">Tooted</h3>
              <div className="mt-4 grid gap-3">
                {snapshot.items.map(item => (
                  <div key={item.slug} className="flex justify-between gap-4 text-sm">
                    <div>
                      <strong>{item.title}</strong>
                      <span className="text-muted ml-2">{item.quantity} tk</span>
                    </div>
                    <strong className="whitespace-nowrap">{((item.salePrice ?? item.price) * item.quantity).toFixed(2)} €</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-extrabold text-sm uppercase text-muted tracking-[0.04em]">Kliendiandmed</h3>
              <div className="mt-3 grid gap-1 text-sm">
                <p><strong>Nimi:</strong> {snapshot.customer.name}</p>
                <p><strong>E-post:</strong> {snapshot.customer.email}</p>
                <p><strong>Telefon:</strong> {snapshot.customer.phone}</p>
                <p><strong>Tarneviis:</strong>{" "}
                  {snapshot.customer.shippingCarrier === "omniva"
                    ? "Omniva pakiautomaat"
                    : snapshot.customer.shippingCarrier === "smartpost"
                      ? "Smartpost pakiautomaat"
                      : snapshot.customer.shippingMethod === "pakiautomaat"
                        ? "Pakiautomaat"
                        : "Kuller"}
                </p>
                {snapshot.parcelMachine && (
                  <p><strong>Pakiautomaat:</strong> {snapshot.parcelMachine.name} — {snapshot.parcelMachine.city}, {snapshot.parcelMachine.address}</p>
                )}
                {!snapshot.parcelMachine && (
                  <p><strong>Aadress:</strong> {snapshot.customer.address}</p>
                )}
                {snapshot.shippingCost !== undefined && snapshot.shippingCost > 0 && (
                  <p><strong>Tarne hind:</strong> {snapshot.shippingCost.toFixed(2)} €</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/raamatud" className="inline-flex items-center gap-2 min-h-[46px] px-6 border border-ink bg-ink text-white font-extrabold hover:bg-[#2a2d30] transition-colors">
            Jätka ostlemist
          </Link>
        </div>
      </section>
    </LayoutContained>
  );
}
