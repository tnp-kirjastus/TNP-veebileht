import type { ReactNode } from "react";
import { LayoutContained } from "@/components/layout";
import { ProfiilShell } from "@/components/profiil/ProfiilShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Konto", robots: { index: false, follow: false } };

export default function ProfiilLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutContained>
      <ProfiilShell>{children}</ProfiilShell>
    </LayoutContained>
  );
}
