-- Migration 035: Ühtne checkout + kupongid andmebaasis
--
-- 1) commerce.coupons — sooduskupongid on andmebaasis ja adminis hallatavad
--    (seni oli kood 'TNP2026' rakendusse hardcode'itud).
-- 2) commerce.checkout_cart — KOGU tellimuse loogika ühes transaktsioonilises
--    RPC-s: laoseis + reservatsioonid, kupong, tarne (content.settings),
--    käibemaks (content.settings), ettetellimused. Asendab senise kahe-
--    harulise rakenduskoodi ja vana create_order_from_cart funktsiooni.

-- ---------------------------------------------------------------------------
-- 1) Kupongid
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commerce.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100),
  max_discount NUMERIC(12,2) NOT NULL DEFAULT 50 CHECK (max_discount >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commerce.coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON commerce.coupons FROM PUBLIC, anon, authenticated;
GRANT ALL ON commerce.coupons TO service_role;

-- Olemasolev kupong migreeritud rakenduse koodist
INSERT INTO commerce.coupons (code, percent, max_discount)
VALUES ('TNP2026', 10, 50)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Ühtne checkout-RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION commerce.checkout_cart(
  p_session_id TEXT,
  p_customer JSONB,
  p_idempotency_key UUID,
  p_coupon_code TEXT DEFAULT NULL,
  p_invoice_requested BOOLEAN DEFAULT false,
  p_company_name TEXT DEFAULT NULL,
  p_company_reg_code TEXT DEFAULT NULL
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
  v_all_preorder BOOLEAN;
  v_coupon commerce.coupons%ROWTYPE;
  v_discount NUMERIC(12,2) := 0;
  v_shipping NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2);
  v_vat_percent NUMERIC(5,2) := 9;
  v_vat_amount NUMERIC(12,2) := 0;
  v_settings RECORD;
  v_rate RECORD;
  v_carrier TEXT := coalesce(p_customer->>'shipping_method', '');
BEGIN
  IF length(trim(coalesce(p_customer->>'name',''))) < 2
     OR position('@' in coalesce(p_customer->>'email','')) < 2 THEN
    RAISE EXCEPTION 'invalid_customer' USING ERRCODE = '22023';
  END IF;

  -- Idempotentsus: sama võtmega tellimus tagastatakse uuesti
  SELECT * INTO v_order FROM commerce.orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_order.id,
      'confirmation_token', v_order.confirmation_token,
      'order_number', v_order.order_number,
      'currency', v_order.currency,
      'total', v_order.total,
      'status', v_order.status
    );
  END IF;

  -- Poe seaded (tarne + käibemaks) otse andmebaasist — ainus tõde
  SELECT shipping, vat INTO v_settings FROM content.settings WHERE key = 'store';
  IF v_settings.vat IS NOT NULL AND v_settings.vat->>'percent' IS NOT NULL THEN
    v_vat_percent := (v_settings.vat->>'percent')::numeric;
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
           p.is_upcoming, p.allow_preorder,
           commerce.effective_price(p.*) AS unit_price
    FROM commerce.cart_items ci
    JOIN commerce.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart.id
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    -- Ettetellitavatel (ilmumas) toodetel laoseisu ei kontrollita
    IF NOT (v_item.is_upcoming AND v_item.allow_preorder) THEN
      SELECT coalesce(sum(sr.quantity), 0)::integer INTO v_reserved
      FROM commerce.stock_reservations sr
      WHERE sr.product_id = v_item.product_id
        AND sr.status = 'active' AND sr.expires_at > now();
      IF v_item.stock - v_reserved < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    v_subtotal := v_subtotal + (v_item.unit_price * v_item.quantity);
  END LOOP;

  SELECT bool_and(p.is_upcoming AND p.allow_preorder) INTO v_all_preorder
  FROM commerce.cart_items ci
  JOIN commerce.products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart.id;

  -- Kupong (kui esitatud, peab kehtima)
  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM commerce.coupons
    WHERE code = upper(btrim(p_coupon_code)) AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_coupon' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_all_preorder THEN
    -- Ettetellimus: hind = 0, makset ega reservatsioone ei looda
    INSERT INTO commerce.orders(
      order_number, status, customer_name, customer_email, customer_phone,
      shipping_address, shipping_method, subtotal, shipping_cost, total,
      cart_id, idempotency_key, currency,
      invoice_requested, company_name, company_reg_code,
      coupon_code, coupon_discount, vat_amount, vat_percent
    ) VALUES (
      'TNP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('commerce.order_number_seq')::text, 6, '0'),
      'preorder', trim(p_customer->>'name'), lower(trim(p_customer->>'email')),
      nullif(trim(p_customer->>'phone'), ''), nullif(trim(p_customer->>'address'), ''),
      nullif(v_carrier, ''), 0, 0, 0,
      v_cart.id, p_idempotency_key, 'EUR',
      coalesce(p_invoice_requested, false), nullif(btrim(coalesce(p_company_name, '')), ''),
      nullif(btrim(coalesce(p_company_reg_code, '')), ''),
      v_coupon.code, 0, 0, v_vat_percent
    ) RETURNING * INTO v_order;

    INSERT INTO commerce.order_items(order_id, product_id, title, price, quantity)
    SELECT v_order.id, p.id, p.title_et, 0, ci.quantity
    FROM commerce.cart_items ci JOIN commerce.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart.id;
  ELSE
    -- Tavatellimus: kupong + tarne + käibemaks
    IF v_coupon.id IS NOT NULL THEN
      v_discount := round(least(v_subtotal * v_coupon.percent / 100, v_coupon.max_discount), 2);
    END IF;

    IF v_settings.shipping IS NOT NULL THEN
      SELECT (r->>'price')::numeric AS price, (r->>'freeFrom')::numeric AS free_from
      INTO v_rate
      FROM jsonb_array_elements(v_settings.shipping->'rates') r
      WHERE r->>'carrier' = v_carrier
      LIMIT 1;
      IF FOUND THEN
        v_shipping := CASE WHEN v_subtotal >= v_rate.free_from THEN 0 ELSE v_rate.price END;
      END IF;
    END IF;

    v_total := round(v_subtotal + v_shipping - v_discount, 2);
    v_vat_amount := round((v_subtotal - v_discount) - (v_subtotal - v_discount) / (1 + v_vat_percent / 100), 2);

    INSERT INTO commerce.orders(
      order_number, status, customer_name, customer_email, customer_phone,
      shipping_address, shipping_method, subtotal, shipping_cost, total,
      cart_id, idempotency_key, currency,
      invoice_requested, company_name, company_reg_code,
      coupon_code, coupon_discount, vat_amount, vat_percent
    ) VALUES (
      'TNP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('commerce.order_number_seq')::text, 6, '0'),
      'payment_pending', trim(p_customer->>'name'), lower(trim(p_customer->>'email')),
      nullif(trim(p_customer->>'phone'), ''), nullif(trim(p_customer->>'address'), ''),
      nullif(v_carrier, ''), v_subtotal, v_shipping, v_total,
      v_cart.id, p_idempotency_key, 'EUR',
      coalesce(p_invoice_requested, false), nullif(btrim(coalesce(p_company_name, '')), ''),
      nullif(btrim(coalesce(p_company_reg_code, '')), ''),
      v_coupon.code, v_discount, v_vat_amount, v_vat_percent
    ) RETURNING * INTO v_order;

    INSERT INTO commerce.order_items(order_id, product_id, title, price, quantity)
    SELECT v_order.id, p.id, p.title_et, commerce.effective_price(p.*), ci.quantity
    FROM commerce.cart_items ci JOIN commerce.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart.id;

    INSERT INTO commerce.stock_reservations(order_id, product_id, quantity, expires_at)
    SELECT v_order.id, ci.product_id, ci.quantity, now() + interval '20 minutes'
    FROM commerce.cart_items ci WHERE ci.cart_id = v_cart.id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'confirmation_token', v_order.confirmation_token,
    'order_number', v_order.order_number,
    'currency', v_order.currency,
    'total', v_order.total,
    'status', v_order.status
  );
END;
$$;

REVOKE ALL ON FUNCTION commerce.checkout_cart(TEXT,JSONB,UUID,TEXT,BOOLEAN,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.checkout_cart(TEXT,JSONB,UUID,TEXT,BOOLEAN,TEXT,TEXT) TO service_role;

-- Vana kahe-harulise checkout'i funktsioon eemaldatud (checkout_cart asendab)
DROP FUNCTION IF EXISTS commerce.create_order_from_cart(TEXT, JSONB, UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS commerce.create_order_from_cart(TEXT, JSONB, UUID);
