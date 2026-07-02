-- Migration 007: Effective price function

CREATE OR REPLACE FUNCTION commerce.effective_price(p commerce.products)
RETURNS DECIMAL(10,2) AS $$
  SELECT CASE
    WHEN p.sale_price IS NOT NULL
     AND (p.sale_start IS NULL OR p.sale_start <= now())
     AND (p.sale_end IS NULL OR p.sale_end >= now())
    THEN p.sale_price
    ELSE p.price
  END;
$$ LANGUAGE sql STABLE SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION commerce.effective_price(commerce.products) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.effective_price(commerce.products)
  TO anon, authenticated, service_role;
