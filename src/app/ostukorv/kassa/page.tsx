import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutGuard } from "@/components/checkout/CheckoutGuard";

export const metadata: Metadata = { title: "Vormista tellimus", robots: { index: false, follow: false } };
export default function CheckoutPage() {
  return (
    <LayoutContained>
      <section className="py-[50px] border-b border-line">
        <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Ostukorv", href: "/ostukorv" }, { label: "Vormista tellimus" }]} />
        <h1 className="font-heading text-[clamp(42px,7vw,78px)] leading-none mt-[18px]">Vormista tellimus</h1>
        <p className="text-muted mt-4">Kontrollime hinna ja saadavuse uuesti enne makse algatamist.</p>
      </section>
      <div className="py-12">
        <CheckoutGuard>
          <CheckoutForm />
        </CheckoutGuard>
      </div>
    </LayoutContained>
  );
}
