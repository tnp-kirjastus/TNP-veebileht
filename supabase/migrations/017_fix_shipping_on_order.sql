-- Migration 017: Fix order creation to store actual shipping_cost and total.
-- create_order_from_cart now accepts p_shipping_cost and p_total
-- so the stored totals match what Maksekeskus receives.

DROP FUNCTION IF EXISTS commerce.create_order_from_cart(TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION commerce.create_order_from_cart(
  p_session_id TEXT,
  p_customer JSONB,
  p_idempotency_key UUID,
  p_shipping_cost NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_cart commerce.carts%ROWTYPE;
  v_order commerce.orders%ROWTYPE;
  v_item RECORD;
  v_subtotal NUMERIC(12,2) := 0;
  v_reserved INTEGER;
  v_shipping_cost NUMERIC(12,2);
  v_total NUMERIC(12,2);
BEGIN
  IF length(trim(coalesce(p_customer->>'name',''))) < 2
     OR position('@' in coalesce(p_customer->>'email','')) < 2 THEN
    RAISE EXCEPTION 'invalid_customer' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM commerce.orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_order.id,
      'confirmation_token', v_order.confirmation_token,
      'order_number', v_order.order_number,
      'currency', v_order.currency,
      'total', v_order.total
    );
  END IF;

  SELECT * INTO v_cart FROM commerce.carts WHERE session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cart_not_found' USING ERRCODE = 'P0002'; END IF;

  DELETE FROM commerce.cart_items ci
  WHERE ci.cart_id = v_cart.id
    AND NOT EXISTS (
      SELECT 1 FROM commerce.products p
      WHERE p.id = ci.product_id AND p.is_archived = false
    );

  IF NOT EXISTS (SELECT 1 FROM commerce.cart_items WHERE cart_id = v_cart.id) THEN
    RAISE EXCEPTION 'empty_cart' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN
    SELECT ci.product_id, ci.quantity, p.title_et, p.stock,
           commerce.effective_price(p.*) AS unit_price
    FROM commerce.cart_items ci
    JOIN commerce.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart.id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    SELECT coalesce(sum(sr.quantity), 0)::integer INTO v_reserved
    FROM commerce.stock_reservations sr
    WHERE sr.product_id = v_item.product_id
      AND sr.status = 'active' AND sr.expires_at > now();
    IF v_item.stock - v_reserved < v_item.quantity THEN
      RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = 'P0001';
    END IF;
    v_subtotal := v_subtotal + (v_item.unit_price * v_item.quantity);
  END LOOP;

  v_shipping_cost := coalesce(p_shipping_cost, 0);
  v_total := coalesce(p_total, v_subtotal + v_shipping_cost);

  INSERT INTO commerce.orders(
    order_number, status, customer_name, customer_email, customer_phone,
    shipping_address, shipping_method, subtotal, shipping_cost, total,
    cart_id, idempotency_key, currency
  ) VALUES (
    'TNP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('commerce.order_number_seq')::text, 6, '0'),
    'payment_pending', trim(p_customer->>'name'), lower(trim(p_customer->>'email')),
    nullif(trim(p_customer->>'phone'), ''), nullif(trim(p_customer->>'address'), ''),
    nullif(trim(p_customer->>'shipping_method'), ''), v_subtotal, v_shipping_cost, v_total,
    v_cart.id, p_idempotency_key, 'EUR'
  ) RETURNING * INTO v_order;

  INSERT INTO commerce.order_items(order_id, product_id, title, price, quantity)
  SELECT v_order.id, p.id, p.title_et, commerce.effective_price(p.*), ci.quantity
  FROM commerce.cart_items ci JOIN commerce.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart.id;

  INSERT INTO commerce.stock_reservations(order_id, product_id, quantity, expires_at)
  SELECT v_order.id, ci.product_id, ci.quantity, now() + interval '20 minutes'
  FROM commerce.cart_items ci WHERE ci.cart_id = v_cart.id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'confirmation_token', v_order.confirmation_token,
    'order_number', v_order.order_number,
    'currency', v_order.currency,
    'total', v_order.total
  );
END;
$$;

REVOKE ALL ON FUNCTION commerce.create_order_from_cart(TEXT, JSONB, UUID, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.create_order_from_cart(TEXT, JSONB, UUID, NUMERIC, NUMERIC) TO service_role;
