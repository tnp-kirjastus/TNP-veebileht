-- Migration 025: Fix anon RLS evaluation for admin policies
-- The FOR ALL admin policies included SELECT, causing anon queries to call
-- is_admin() which was revoked from anon, resulting in "permission denied"
-- for all public-facing queries on these tables.
--
-- Fix: Grant EXECUTE on is_admin() to PUBLIC (returns false for anon).
-- Also split FOR ALL into specific INSERT/UPDATE/DELETE policies so that
-- future policy evaluation is unambiguous.

-- Step 1: Allow anon to evaluate is_admin (safe — returns false when no auth.uid())
GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC;

-- Step 2: Split FOR ALL policies to exclude SELECT

-- content.posts
DROP POLICY IF EXISTS "Admins manage posts" ON content.posts;
CREATE POLICY "Admins insert posts" ON content.posts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update posts" ON content.posts FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete posts" ON content.posts FOR DELETE USING (public.is_admin());

-- content.series
DROP POLICY IF EXISTS "Admins manage series" ON content.series;
CREATE POLICY "Admins insert series" ON content.series FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update series" ON content.series FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete series" ON content.series FOR DELETE USING (public.is_admin());

-- content.pages
DROP POLICY IF EXISTS "Admins manage pages" ON content.pages;
CREATE POLICY "Admins insert pages" ON content.pages FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update pages" ON content.pages FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete pages" ON content.pages FOR DELETE USING (public.is_admin());

-- content.campaigns
DROP POLICY IF EXISTS "Admins manage campaigns" ON content.campaigns;
CREATE POLICY "Admins insert campaigns" ON content.campaigns FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update campaigns" ON content.campaigns FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete campaigns" ON content.campaigns FOR DELETE USING (public.is_admin());

-- content.campaign_products
DROP POLICY IF EXISTS "Admins manage campaign_products" ON content.campaign_products;
CREATE POLICY "Admins insert campaign_products" ON content.campaign_products FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update campaign_products" ON content.campaign_products FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete campaign_products" ON content.campaign_products FOR DELETE USING (public.is_admin());

-- commerce.products
DROP POLICY IF EXISTS "Admins can manage products" ON commerce.products;
CREATE POLICY "Admins insert products" ON commerce.products FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update products" ON commerce.products FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete products" ON commerce.products FOR DELETE USING (public.is_admin());

-- commerce.categories
DROP POLICY IF EXISTS "Admins manage categories" ON commerce.categories;
CREATE POLICY "Admins insert categories" ON commerce.categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update categories" ON commerce.categories FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete categories" ON commerce.categories FOR DELETE USING (public.is_admin());

-- commerce.product_categories
DROP POLICY IF EXISTS "Admins manage product_categories" ON commerce.product_categories;
CREATE POLICY "Admins insert product_categories" ON commerce.product_categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update product_categories" ON commerce.product_categories FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete product_categories" ON commerce.product_categories FOR DELETE USING (public.is_admin());

-- commerce.product_people
DROP POLICY IF EXISTS "Admins manage product_people" ON commerce.product_people;
CREATE POLICY "Admins insert product_people" ON commerce.product_people FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update product_people" ON commerce.product_people FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete product_people" ON commerce.product_people FOR DELETE USING (public.is_admin());

-- commerce.product_images
DROP POLICY IF EXISTS "Admins manage product_images" ON commerce.product_images;
CREATE POLICY "Admins insert product_images" ON commerce.product_images FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update product_images" ON commerce.product_images FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete product_images" ON commerce.product_images FOR DELETE USING (public.is_admin());

-- people.people
DROP POLICY IF EXISTS "Admins manage people" ON people.people;
CREATE POLICY "Admins insert people" ON people.people FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins update people" ON people.people FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete people" ON people.people FOR DELETE USING (public.is_admin());
