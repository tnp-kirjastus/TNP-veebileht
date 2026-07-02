-- Migration 009: Order token lookup RPC

CREATE OR REPLACE FUNCTION commerce.get_order_by_token(p_token TEXT)
RETURNS TABLE(
  order_number TEXT,
  status TEXT,
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ
) AS $$
  SELECT order_number, status, total, created_at
  FROM commerce.orders
  WHERE length(p_token) = 64
    AND confirmation_token = p_token;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog;

REVOKE ALL ON FUNCTION commerce.get_order_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commerce.get_order_by_token(TEXT)
  TO anon, authenticated, service_role;
