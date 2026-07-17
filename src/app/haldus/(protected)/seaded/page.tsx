import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import type { StoreSettings } from "../../settings-actions";

const DEFAULT_SHIPPING_RATES = {
  rates: [
    { carrier: "omniva", method: "parcel_machine", price: 5.0, freeFrom: 40, label_et: "Omniva pakiautomaat" },
    { carrier: "smartpost", method: "parcel_machine", price: 3.5, freeFrom: 40, label_et: "Smartpost pakiautomaat" },
  ],
};

async function loadSettings(): Promise<StoreSettings> {
  const db = createAdminClient();
  const { data } = await db.schema("content").from("settings")
    .select("shipping, email, vat, company, social, theme")
    .eq("key", "store")
    .maybeSingle();
  const shipping = data?.shipping as { rates?: unknown[] } | null | undefined;

  return {
    shipping: (shipping?.rates?.length ? shipping : DEFAULT_SHIPPING_RATES) as StoreSettings["shipping"],
    email: (data?.email ?? { fromAddress: "", orderSubject: "", orderBody: "" }) as StoreSettings["email"],
    vat: (data?.vat ?? { percent: 9 }) as StoreSettings["vat"],
    company: (data?.company ?? { name: "", email: "", phone: "", address: "", regCode: "" }) as StoreSettings["company"],
    social: (data?.social ?? { facebook: "", instagram: "" }) as StoreSettings["social"],
    theme: (data?.theme ?? { accentColor: "#4a1aa1", accentColorDark: "#31106c" }) as StoreSettings["theme"],
  };
}

export default async function SettingsPage() {
  await requireAdminSession(["admin"]);

  const settings = await loadSettings();

  return (
    <div>
      <AdminPageHeader
        title="Seaded"
        description="Poe seadete haldamine — tarne, e-kirjad, käibemaks, ettevõtte info ja sotsiaalmeedia."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
