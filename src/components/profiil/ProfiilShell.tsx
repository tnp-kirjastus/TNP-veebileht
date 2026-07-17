"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { AccountNav } from "./AccountNav";

export function ProfiilShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-12 grid grid-cols-[240px_1fr] gap-10 max-[760px]:grid-cols-1">
      {user && (
        <aside className="max-[760px]:hidden">
          <AccountNav />
        </aside>
      )}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
