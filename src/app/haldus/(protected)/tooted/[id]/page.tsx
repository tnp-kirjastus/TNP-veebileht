import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const [prodResult, serResult] = await Promise.allSettled([
    db.schema("commerce").from("products").select("*").eq("id", id).single(),
    db.schema("content").from("series").select("id,slug,name_et").order("name_et"),
  ]);

  if (prodResult.status !== "fulfilled" || !prodResult.value.data) notFound();

  const product = prodResult.value.data;
  const series = serResult.status === "fulfilled" ? (serResult.value.data ?? []) : [];

  const editable = {
    id: product.id,
    sku: product.sku ?? "",
    title_et: product.title_et ?? "",
    title_en: product.title_en,
    slug: product.slug ?? "",
    description_et: product.description_et,
    description_en: product.description_en,
    price: Number(product.price ?? 0),
    sale_price: product.sale_price != null ? Number(product.sale_price) : null,
    sale_start: product.sale_start,
    sale_end: product.sale_end,
    stock: Number(product.stock ?? 0),
    binding: product.binding,
    pages: product.pages != null ? Number(product.pages) : null,
    release_date: product.release_date,
    origin: product.origin ?? "estonian",
    is_upcoming: product.is_upcoming ?? false,
    is_archived: product.is_archived ?? false,
    is_featured: product.is_featured ?? false,
    allow_preorder: product.allow_preorder ?? true,
    cover_image: product.cover_image,
    series_id: product.series_id,
    editions: product.editions ?? [],
  };

  return (
    <>
      <AdminPageHeader
        title={product.title_et || "Toote muutmine"}
        description={product.sku ? `ISBN: ${product.sku}` : "Muuda toote andmeid."}
        breadcrumbs={[{ label: "Ülevaade", href: "/haldus" }, { label: "Tooted", href: "/haldus/tooted" }, { label: product.title_et || "Muutmine" }]}
      />
      <ProductForm product={editable} series={series} />
    </>
  );
}
