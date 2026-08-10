import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { CouponsSection, type CouponRow } from "@/components/admin/CouponsSection";
import { getStoreSettings } from "@/lib/settings";
import type { StoreSettings } from "../../settings-actions";

async function loadCoupons(): Promise<CouponRow[]> {
  const { data } = await createAdminClient()
    .schema("commerce")
    .from("coupons")
    .select("id, code, percent, max_discount, is_active")
    .order("created_at", { ascending: false });
  return (data ?? []) as CouponRow[];
}

export default async function SettingsPage() {
  await requireAdminSession(["admin"]);

  const [settings, coupons] = await Promise.all([getStoreSettings(), loadCoupons()]);

  return (
    <div>
      <AdminPageHeader
        title="Seaded"
        description="Poe seadete haldamine — tarne, e-kirjad, käibemaks, kupongid, ettevõtte info, sotsiaalmeedia ja kujundus."
      />
      <SettingsForm settings={settings as unknown as StoreSettings} />
      <CouponsSection coupons={coupons} />
    </div>
  );
}
