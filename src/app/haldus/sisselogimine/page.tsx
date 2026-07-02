import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Haldusesse sisselogimine", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return <main id="main-content" className="min-h-screen bg-paper grid place-items-center p-4"><section className="w-full max-w-md bg-panel border border-line p-8"><h1 className="font-heading text-4xl">Tänapäev Haldus</h1><p className="text-muted mt-3">Sisene oma tööalase kontoga.</p><LoginForm /></section></main>;
}
