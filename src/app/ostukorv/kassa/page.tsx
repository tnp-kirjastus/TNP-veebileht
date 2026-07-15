import type { Metadata } from "next";
import { LayoutContained } from "@/components/layout";
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutGuard } from "@/components/checkout/CheckoutGuard";
import { CheckoutTitle } from "./CheckoutTitle";

export const metadata: Metadata = { title: "Vormista tellimus", robots: { index: false, follow: false } };
export default function CheckoutPage() {
  return (
    <LayoutContained>
      <section className="py-[50px] border-b border-line">
        <Breadcrumbs crumbs={[{ label: "Esileht", href: "/" }, { label: "Ostukorv", href: "/ostukorv" }, { label: "Vormista tellimus" }]} />
        <CheckoutTitle />
      </section>
      <div className="py-12">
        <CheckoutGuard>
          <CheckoutForm />
        </CheckoutGuard>
      </div>
    </LayoutContained>
  );
}
