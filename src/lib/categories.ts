import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getCategoryTree() {
  const supabase = createAdminClient();
  const { data } = await supabase.schema("commerce").from("categories").select("*").order("sort_order");
  return data || [];
}
