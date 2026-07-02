import type { Metadata } from "next";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawerProvider } from "@/lib/cart-drawer-context";
import { CartDrawerWrapper } from "@/components/store/CartDrawerWrapper";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { template: "%s — Tänapäev", default: "Tänapäev — Raamatud, sarjad ja kampaaniad ühest kohast" },
  description: "Kirjastus Tänapäev veebipood. Uued raamatud, sarjad, pakkumised. Tasuta tarne alates 40 eurost.",
  openGraph: { title: "Tänapäev veebipood", description: "Uued raamatud, sarjad ja kampaaniad ühest kohast", images: [{ url: "/tanapaeva-logo.png", width: 348, height: 176 }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 bg-ink px-4 py-3 font-bold text-white focus:translate-y-0">Liigu põhisisu juurde</a>
        <CartProvider>
          <CartDrawerProvider>
            {children}
            <CartDrawerWrapper />
          </CartDrawerProvider>
        </CartProvider>
      </body>
    </html>
  );
}
