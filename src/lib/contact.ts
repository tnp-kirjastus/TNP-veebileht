import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitContactMessage(data: {
  name: string;
  email: string;
  message: string;
  locale: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.schema("content").rpc("submit_contact_message", {
    p_name: data.name,
    p_email: data.email,
    p_message: data.message,
    p_locale: data.locale,
  });
  return { ok: !error };
}
