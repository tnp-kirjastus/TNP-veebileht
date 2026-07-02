import "server-only";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCartSession, verifyCartSession } from "@/lib/cart-session";
import { serverEnv } from "@/lib/env";

const COOKIE_NAME = "tnp_cart";

export interface CartDtoItem {
  slug: string;
  title: string;
  author: string;
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  coverImage: string | null;
  quantity: number;
}

export interface CartDto {
  items: CartDtoItem[];
  itemCount: number;
  totalCents: number;
}

export async function getCartSession(create = false) {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  const verified = existing ? await verifyCartSession(existing) : null;
  if (verified || !create) return verified;

  const session = await createCartSession();
  store.set(COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return session.sessionId;
}

function effectivePrice(product: { price: number; sale_price: number | null; sale_start: string | null; sale_end: string | null }) {
  const now = Date.now();
  const start = product.sale_start ? Date.parse(product.sale_start) : null;
  const end = product.sale_end ? Date.parse(product.sale_end) : null;
  return product.sale_price !== null && product.sale_price < product.price
    && (start === null || (!Number.isNaN(start) && start <= now))
    && (end === null || (!Number.isNaN(end) && end >= now))
    ? product.sale_price : product.price;
}

export async function readCart(sessionId: string): Promise<CartDto> {
  const db = createAdminClient();
  const { data: cart } = await db.schema("commerce").from("carts")
    .select("id").eq("session_id", sessionId).maybeSingle();
  if (!cart) return { items: [], itemCount: 0, totalCents: 0 };

  const { data, error } = await db.schema("commerce").from("cart_items")
    .select("quantity, products!inner(slug,title_et,price,sale_price,sale_start,sale_end,cover_image,is_archived)")
    .eq("cart_id", cart.id);
  if (error) throw new Error("cart_read_failed");

  const items: CartDtoItem[] = (data ?? []).flatMap((row) => {
    const productValue = row.products as unknown;
    const product = (Array.isArray(productValue) ? productValue[0] : productValue) as {
      slug: string; title_et: string; price: number; sale_price: number | null;
      sale_start: string | null; sale_end: string | null; cover_image: string | null; is_archived: boolean;
    } | null;
    if (!product || product.is_archived) return [];
    const current = effectivePrice(product);
    return [{
      slug: product.slug,
      title: product.title_et,
      author: "",
      price: Number(product.price),
      salePrice: current < Number(product.price) ? current : null,
      effectivePrice: current,
      coverImage: product.cover_image,
      quantity: row.quantity,
    }];
  });
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totalCents: items.reduce((sum, item) => sum + Math.round(item.effectivePrice * 100) * item.quantity, 0),
  };
}

export async function mutateCart(sessionId: string, slug: string, quantity: number | null) {
  const db = createAdminClient();
  const { data: product } = await db.schema("commerce").from("products")
    .select("id,is_archived").eq("slug", slug).eq("is_archived", false).maybeSingle();
  if (!product) throw new Error("product_not_found");

  const { data: cart, error: cartError } = await db.schema("commerce").from("carts")
    .upsert({ session_id: sessionId, updated_at: new Date().toISOString() }, { onConflict: "session_id" })
    .select("id").single();
  if (cartError || !cart) throw new Error("cart_write_failed");

  if (quantity === null || quantity < 1) {
    await db.schema("commerce").from("cart_items")
      .delete().eq("cart_id", cart.id).eq("product_id", product.id);
  } else {
    if (!Number.isInteger(quantity) || quantity > 99) throw new Error("invalid_quantity");
    const { error } = await db.schema("commerce").from("cart_items")
      .upsert({ cart_id: cart.id, product_id: product.id, quantity }, { onConflict: "cart_id,product_id" });
    if (error) throw new Error("cart_write_failed");
  }
  return readCart(sessionId);
}
