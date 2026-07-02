-- Migration 010: RLS Policies & Grants

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','editor'),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Public tables: anon SELECT
ALTER TABLE commerce.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly visible" ON commerce.products FOR SELECT USING (true);

ALTER TABLE commerce.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly visible" ON commerce.categories FOR SELECT USING (true);

ALTER TABLE commerce.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product cats publicly visible" ON commerce.product_categories FOR SELECT USING (true);

ALTER TABLE commerce.product_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product people publicly visible" ON commerce.product_people FOR SELECT USING (true);

ALTER TABLE commerce.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images publicly visible" ON commerce.product_images FOR SELECT USING (true);

ALTER TABLE people.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People are publicly visible" ON people.people FOR SELECT USING (true);

ALTER TABLE content.series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Series are publicly visible" ON content.series FOR SELECT USING (true);

ALTER TABLE content.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are visible" ON content.posts FOR SELECT USING (is_published = true);

ALTER TABLE content.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pages are publicly visible" ON content.pages FOR SELECT USING (true);

ALTER TABLE content.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns publicly visible" ON content.campaigns FOR SELECT USING (true);

ALTER TABLE content.campaign_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaign products publicly visible" ON content.campaign_products FOR SELECT USING (true);

-- Promotions
ALTER TABLE commerce.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promotions publicly visible" ON commerce.promotions FOR SELECT USING (true);

ALTER TABLE commerce.promotion_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promotion products publicly visible" ON commerce.promotion_products FOR SELECT USING (true);

-- Admin-only write access
CREATE POLICY "Admins can manage products" ON commerce.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage categories" ON commerce.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage product_categories" ON commerce.product_categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage product_people" ON commerce.product_people
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage product_images" ON commerce.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage people" ON people.people
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage series" ON content.series
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage posts" ON content.posts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage pages" ON content.pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage campaigns" ON content.campaigns
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage campaign_products" ON content.campaign_products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Carts: server-only (no anon policies)
ALTER TABLE commerce.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.cart_items ENABLE ROW LEVEL SECURITY;

-- Orders: no anon SELECT, use RPC
ALTER TABLE commerce.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.order_items ENABLE ROW LEVEL SECURITY;

-- Contact: server-only
ALTER TABLE content.contact_messages ENABLE ROW LEVEL SECURITY;

-- Payment events: service_role only
ALTER TABLE commerce.payment_events ENABLE ROW LEVEL SECURITY;

-- PUBLIC GRANTS
GRANT SELECT ON commerce.products, commerce.categories, commerce.product_categories,
               commerce.product_people, commerce.product_images,
               commerce.promotions, commerce.promotion_products
  TO anon;

GRANT SELECT ON content.series, content.posts, content.pages, content.campaigns,
               content.campaign_products
  TO anon;

GRANT SELECT ON people.people TO anon;

-- AUTHENTICATED: same read as anon
GRANT SELECT ON commerce.products, commerce.categories, commerce.product_categories,
               commerce.product_people, commerce.product_images,
               commerce.promotions, commerce.promotion_products
  TO authenticated;

GRANT SELECT ON content.series, content.posts, content.pages, content.campaigns,
               content.campaign_products
  TO authenticated;

GRANT SELECT ON people.people TO authenticated;

-- SERVICE ROLE: full access
GRANT ALL ON ALL TABLES IN SCHEMA commerce, content, people, smaily, system TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA commerce, content, people, smaily, system TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA commerce, content, people, smaily TO service_role;

-- AUTHENTICATED: write access for admins (RLS checks is_admin)
GRANT INSERT, UPDATE, DELETE ON commerce.products, commerce.categories,
  commerce.product_categories, commerce.product_people, commerce.product_images
  TO authenticated;

GRANT INSERT, UPDATE, DELETE ON content.series, content.posts, content.pages,
  content.campaigns, content.campaign_products
  TO authenticated;

GRANT INSERT, UPDATE, DELETE ON people.people TO authenticated;

-- Revoke internal trigger helpers from public
REVOKE ALL ON FUNCTION commerce.rebuild_product_search_vector(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION commerce.trg_rebuild_product_search() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION commerce.trg_rebuild_product_search_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION commerce.trg_rebuild_products_for_related_name() FROM PUBLIC, anon, authenticated;
