-- Public catalogue data is exposed through reviewed functions, not raw operational rows.
DROP POLICY IF EXISTS "Products are publicly visible" ON commerce.products;
DROP POLICY IF EXISTS "Product cats publicly visible" ON commerce.product_categories;
DROP POLICY IF EXISTS "Product people publicly visible" ON commerce.product_people;
DROP POLICY IF EXISTS "Product images publicly visible" ON commerce.product_images;
DROP POLICY IF EXISTS "Promotions publicly visible" ON commerce.promotions;
DROP POLICY IF EXISTS "Promotion products publicly visible" ON commerce.promotion_products;

REVOKE SELECT ON commerce.products, commerce.product_categories, commerce.product_people,
  commerce.product_images, commerce.promotions, commerce.promotion_products FROM anon, authenticated;

-- Taxonomy and public identity data contain no stock, pricing internals, or private workflow state.
DROP POLICY IF EXISTS "Categories are publicly visible" ON commerce.categories;
CREATE POLICY "Active catalogue categories are visible" ON commerce.categories FOR SELECT TO anon, authenticated USING (true);

-- The function already filters archived products and returns an explicit DTO only.
GRANT EXECUTE ON FUNCTION commerce.search_products(TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,TEXT,TEXT,INTEGER,INTEGER)
  TO anon, authenticated;

-- Future objects and functions in private schemas do not become public by accident.
ALTER DEFAULT PRIVILEGES IN SCHEMA commerce REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA content REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA people REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA smaily REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA system REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA commerce REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA content REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA smaily REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA system REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
