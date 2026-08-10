"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";

const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Kood peab olema vähemalt 2 tähemärki.")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Kood võib sisaldada ainult tähti, numbreid, side- ja alakriipse."),
  percent: z.coerce.number().min(0.01, "Protsent peab olema üle 0.").max(100),
  max_discount: z.coerce.number().min(0, "Maksimaalne allahindlus ei saa olla negatiivne.").max(100000),
});

export async function saveCoupon(_state: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const parsed = couponSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrolli välju." };

  const code = parsed.data.code.toUpperCase();
  const db = createAdminClient();
  const { data, error } = await db.schema("commerce").from("coupons")
    .upsert(
      { code, percent: parsed.data.percent, max_discount: parsed.data.max_discount, is_active: true },
      { onConflict: "code" },
    )
    .select("id")
    .single();

  if (error) return { error: "Salvestamine ebaõnnestus." };
  await audit(session.user.id, "coupon.saved", "commerce.coupon", data.id, { after: { code, percent: parsed.data.percent } });
  return { success: true };
}

export async function toggleCoupon(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));
  const isActive = formData.get("is_active") === "true";

  const db = createAdminClient();
  const { data, error } = await db.schema("commerce").from("coupons")
    .update({ is_active: !isActive })
    .eq("id", id)
    .select("code")
    .single();
  if (!error) {
    await audit(session.user.id, isActive ? "coupon.deactivated" : "coupon.activated", "commerce.coupon", id, { after: { code: data?.code } });
  }
}

export async function deleteCoupon(formData: FormData) {
  const session = await requireAdminSession(["admin"]);
  const id = z.string().uuid().parse(formData.get("id"));

  const db = createAdminClient();
  const { data, error } = await db.schema("commerce").from("coupons")
    .delete()
    .eq("id", id)
    .select("code")
    .single();
  if (!error) {
    await audit(session.user.id, "coupon.deleted", "commerce.coupon", id, { before: { code: data?.code } });
  }
}
