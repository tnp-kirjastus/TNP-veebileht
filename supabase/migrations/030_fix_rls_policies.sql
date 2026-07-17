-- Migration 030: Fix RLS gaps from audit.
-- Restores missing policies on tables that lost SELECT coverage,
-- adds admin read policies back to products and related tables,
-- and fixes promotions to be usable.

-- 1. Restore admin SELECT policies for products + junction tables
-- These were dropped in 015 (public read) and 025 split FOR ALL into INSERT/UPDATE/DELETE only.
CREATE POLICY "Admins read products" ON commerce.products
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins read product_categories" ON commerce.product_categories
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins read product_people" ON commerce.product_people
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins read product_images" ON commerce.product_images
  FOR SELECT USING (public.is_admin());

-- 2. promotions / promotion_products: add complete policies
-- These had their public SELECT policy dropped in 015 with no replacement.

CREATE POLICY "Admins read promotions" ON commerce.promotions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins insert promotions" ON commerce.promotions
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins update promotions" ON commerce.promotions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete promotions" ON commerce.promotions
  FOR DELETE USING (public.is_admin());

CREATE POLICY "Admins read promotion_products" ON commerce.promotion_products
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins insert promotion_products" ON commerce.promotion_products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins update promotion_products" ON commerce.promotion_products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete promotion_products" ON commerce.promotion_products
  FOR DELETE USING (public.is_admin());

-- 3. Grant appropriate privileges
GRANT SELECT ON commerce.products TO anon, authenticated;
GRANT SELECT ON commerce.product_categories TO anon, authenticated;
GRANT SELECT ON commerce.product_people TO anon, authenticated;
GRANT SELECT ON commerce.product_images TO anon, authenticated;
GRANT SELECT ON commerce.promotions TO anon, authenticated;
GRANT SELECT ON commerce.promotion_products TO anon, authenticated;

-- 4. Add index on orders.created_at for the order list page
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON commerce.orders (created_at DESC);
