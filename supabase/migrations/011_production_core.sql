-- Production commerce, consent, audit, and rate-limit invariants.
-- Forward-only migration; safe to re-run in a fresh local project.

CREATE SEQUENCE IF NOT EXISTS commerce.order_number_seq START 1000;

ALTER TABLE commerce.orders
  ADD COLUMN IF NOT EXISTS cart_id UUID REFERENCES commerce.carts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key UUID,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  ADD COLUMN IF NOT EXISTS reconciliation_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_idx
  ON commerce.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS commerce.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES commerce.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS stock_reservations_active_product_idx
  ON commerce.stock_reservations(product_id, expires_at)
  WHERE status = 'active';

ALTER TABLE commerce.payment_events
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'maksekeskus',
  ADD COLUMN IF NOT EXISTS provider_event_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS merchant_identity TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_idx
  ON commerce.payment_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS system.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  before_summary JSONB,
  after_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content.posts
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS excerpt_en TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_published_idx
  ON content.posts(published_at DESC, id DESC) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS smaily.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('opt_in_requested','consented','withdrawn','erased')),
  source TEXT NOT NULL,
  consent_text_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID REFERENCES commerce.orders(id) ON DELETE SET NULL,
  request_evidence JSONB
);

CREATE TABLE IF NOT EXISTS smaily.subscriber_events (
  seq_id BIGINT PRIMARY KEY,
  provider_action TEXT NOT NULL,
  provider_time TIMESTAMPTZ NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  error_code TEXT
);

CREATE TABLE IF NOT EXISTS smaily.sync_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  last_seq_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO smaily.sync_state(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS smaily.retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_id UUID,
  leased_until TIMESTAMPTZ,
  last_error_code TEXT,
  completed_at TIMESTAMPTZ,
  dead_lettered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS smaily_retry_pending_idx
  ON smaily.retry_queue(available_at, created_at)
  WHERE completed_at IS NULL AND dead_lettered_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'system' AND table_name = 'rate_limits' AND column_name = 'ip'
  ) THEN
    ALTER TABLE system.rate_limits RENAME COLUMN ip TO key_hash;
  END IF;
END $$;

ALTER TABLE commerce.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smaily.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smaily.subscriber_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE smaily.sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE smaily.retry_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON commerce.stock_reservations, commerce.outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL ON system.rate_limits, system.audit_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON smaily.consent_log, smaily.subscriber_events, smaily.sync_state, smaily.retry_queue FROM PUBLIC, anon, authenticated;

GRANT ALL ON commerce.stock_reservations, commerce.outbox TO service_role;
GRANT ALL ON system.rate_limits, system.audit_log TO service_role;
GRANT ALL ON smaily.consent_log, smaily.subscriber_events, smaily.sync_state, smaily.retry_queue TO service_role;
GRANT USAGE, SELECT ON SEQUENCE commerce.order_number_seq TO service_role;

CREATE OR REPLACE FUNCTION system.consume_rate_limit(
  p_key_hash TEXT,
  p_endpoint TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  current_count INTEGER;
  bucket_start TIMESTAMPTZ := date_trunc('second', now())
    - make_interval(secs => mod(extract(epoch from now())::integer, p_window_seconds));
BEGIN
  IF p_window_seconds < 1 OR p_max_requests < 1 OR length(p_key_hash) < 16 THEN
    RETURN false;
  END IF;

  INSERT INTO system.rate_limits(key_hash, endpoint, window_start, request_count)
  VALUES (p_key_hash, p_endpoint, bucket_start, 1)
  ON CONFLICT (key_hash, endpoint) DO UPDATE
    SET window_start = CASE
          WHEN system.rate_limits.window_start < bucket_start THEN bucket_start
          ELSE system.rate_limits.window_start
        END,
        request_count = CASE
          WHEN system.rate_limits.window_start < bucket_start THEN 1
          ELSE system.rate_limits.request_count + 1
        END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_max_requests;
END;
$$;

REVOKE ALL ON FUNCTION system.consume_rate_limit(TEXT,TEXT,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION system.consume_rate_limit(TEXT,TEXT,INTEGER,INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION commerce.create_order_from_cart(
  p_session_id TEXT,
  p_customer JSONB,
  p_idempotency_key UUID
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

  INSERT INTO commerce.orders(
    order_number, status, customer_name, customer_email, customer_phone,
    shipping_address, shipping_method, subtotal, shipping_cost, total,
    cart_id, idempotency_key, currency
  ) VALUES (
    'TNP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('commerce.order_number_seq')::text, 6, '0'),
    'payment_pending', trim(p_customer->>'name'), lower(trim(p_customer->>'email')),
    nullif(trim(p_customer->>'phone'), ''), nullif(trim(p_customer->>'address'), ''),
    nullif(trim(p_customer->>'shipping_method'), ''), v_subtotal, 0, v_subtotal,
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

REVOKE ALL ON FUNCTION commerce.create_order_from_cart(TEXT,JSONB,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.create_order_from_cart(TEXT,JSONB,UUID) TO service_role;

CREATE OR REPLACE FUNCTION commerce.release_expired_reservations(p_batch_size INTEGER DEFAULT 100)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE changed INTEGER;
BEGIN
  WITH claimed AS (
    SELECT id, order_id FROM commerce.stock_reservations
    WHERE status = 'active' AND expires_at <= now()
    ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_batch_size, 1), 1000)
  ), released AS (
    UPDATE commerce.stock_reservations sr SET status = 'released'
    FROM claimed c WHERE sr.id = c.id RETURNING c.order_id
  )
  UPDATE commerce.orders o SET status = 'expired', updated_at = now()
  WHERE o.id IN (SELECT order_id FROM released)
    AND o.status IN ('pending','payment_pending');
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION commerce.release_expired_reservations(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.release_expired_reservations(INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION commerce.claim_outbox(p_worker_id UUID, p_batch_size INTEGER DEFAULT 20)
RETURNS SETOF commerce.outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH claimed AS (
    SELECT id FROM commerce.outbox
    WHERE processed_at IS NULL AND dead_lettered_at IS NULL
      AND available_at <= now() AND (leased_until IS NULL OR leased_until < now())
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_batch_size, 1), 100)
  )
  UPDATE commerce.outbox o
  SET lease_id = p_worker_id, leased_until = now() + interval '2 minutes'
  FROM claimed c WHERE o.id = c.id RETURNING o.*;
$$;

REVOKE ALL ON FUNCTION commerce.claim_outbox(UUID,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.claim_outbox(UUID,INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION commerce.complete_outbox(p_id UUID, p_lease_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH done AS (
    UPDATE commerce.outbox SET processed_at = now(), lease_id = NULL, leased_until = NULL
    WHERE id = p_id AND lease_id = p_lease_id AND leased_until > now()
      AND processed_at IS NULL RETURNING 1
  ) SELECT EXISTS(SELECT 1 FROM done);
$$;

REVOKE ALL ON FUNCTION commerce.complete_outbox(UUID,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.complete_outbox(UUID,UUID) TO service_role;

