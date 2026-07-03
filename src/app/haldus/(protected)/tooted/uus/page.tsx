import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NewProductPage() {
  const db = createAdminClient();
  const { data: seriesData } = await db.schema("content").from("series").select("id,slug,name_et").order("name_et");
  const series = seriesData ?? [];

  return (
    <>
      <AdminPageHeader
        title="Uus toode"
        description="Loo uus raamat kataloogi."
        breadcrumbs={[{ label: "Ülevaade", href: "/haldus" }, { label: "Tooted", href: "/haldus/tooted" }, { label: "Uus" }]}
      />
      <ProductForm series={series} />
    </>
  );
}
