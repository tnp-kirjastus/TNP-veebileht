-- Migration 029: Order status history and timestamp tracking.
-- Adds timestamp columns for status transitions, a history table,
-- and notification toggle settings.

-- 1. Add timestamp columns for status transitions
ALTER TABLE commerce.orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 2. Create order_status_history table
CREATE TABLE commerce.order_status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_status_history_order
  ON commerce.order_status_history(order_id, created_at DESC);

ALTER TABLE commerce.order_status_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read history of their own orders
CREATE POLICY "Users read own order history" ON commerce.order_status_history
  FOR SELECT
  USING (
    order_id IN (
      SELECT o.id FROM commerce.orders o WHERE o.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins can read all
CREATE POLICY "Admins read all history" ON commerce.order_status_history
  FOR SELECT
  USING (public.is_admin());

-- Admins can insert
CREATE POLICY "Admins insert history" ON commerce.order_status_history
  FOR INSERT
  WITH CHECK (public.is_admin());

GRANT SELECT ON commerce.order_status_history TO authenticated;
GRANT SELECT, INSERT ON commerce.order_status_history TO service_role;

-- 3. Update process_payment_event to record status history
CREATE OR REPLACE FUNCTION commerce.process_payment_event(
  p_event_id TEXT,
  p_transaction_id TEXT,
  p_reference TEXT,
  p_status TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_merchant_identity TEXT,
  p_payload_hash TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE v_order commerce.orders%ROWTYPE; v_existing UUID; v_active_count INTEGER;
BEGIN
  SELECT id INTO v_existing FROM commerce.payment_events
  WHERE provider = 'maksekeskus' AND provider_event_id = p_event_id;
  IF FOUND THEN RETURN 'duplicate'; END IF;

  SELECT * INTO v_order FROM commerce.orders WHERE order_number = p_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_order' USING ERRCODE = 'P0002'; END IF;
  IF v_order.maksekeskus_id IS NOT NULL AND v_order.maksekeskus_id <> p_transaction_id THEN
    RAISE EXCEPTION 'transaction_mismatch' USING ERRCODE = '22023';
  END IF;
  IF v_order.total <> p_amount OR v_order.currency <> p_currency THEN
    RAISE EXCEPTION 'amount_or_currency_mismatch' USING ERRCODE = '22023';
  END IF;

  INSERT INTO commerce.payment_events(
    idempotency_key, order_id, event_type, payload, provider,
    provider_event_id, provider_transaction_id, amount, currency, merchant_identity
  ) VALUES (
    p_event_id, v_order.id, p_status,
    jsonb_build_object('payload_hash', p_payload_hash), 'maksekeskus',
    p_event_id, p_transaction_id, p_amount, p_currency, p_merchant_identity
  );

  IF p_status IN ('APPROVED','COMPLETED') AND v_order.status <> 'paid' THEN
    PERFORM 1 FROM commerce.stock_reservations
    WHERE order_id = v_order.id AND status = 'active' FOR UPDATE;
    SELECT count(*) INTO v_active_count FROM commerce.stock_reservations
    WHERE order_id = v_order.id AND status = 'active' AND expires_at > now();
    IF v_active_count = 0 THEN
      UPDATE commerce.orders SET status = 'manual_review', reconciliation_reason = 'paid_after_reservation_expiry', updated_at = now() WHERE id = v_order.id;
      INSERT INTO commerce.order_status_history(order_id, status, note, changed_by)
        VALUES (v_order.id, 'manual_review', 'Makse laekus peale broneeringu aegumist', NULL);
      INSERT INTO commerce.outbox(event_type,payload) VALUES ('payment.manual_reconciliation', jsonb_build_object('order_id', v_order.id, 'reason', 'paid_after_reservation_expiry'));
      RETURN 'manual_review';
    END IF;

    UPDATE commerce.products p SET stock = p.stock - sr.quantity
    FROM commerce.stock_reservations sr
    WHERE sr.order_id = v_order.id AND sr.product_id = p.id
      AND sr.status = 'active' AND sr.expires_at > now() AND p.stock >= sr.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'stock_settlement_failed'; END IF;
    UPDATE commerce.stock_reservations SET status = 'consumed' WHERE order_id = v_order.id AND status = 'active';
    UPDATE commerce.orders SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = v_order.id;
    INSERT INTO commerce.order_status_history(order_id, status, note, changed_by)
      VALUES (v_order.id, 'paid', 'Makse laekus (Maksekeskus)', NULL);
    DELETE FROM commerce.cart_items WHERE cart_id = v_order.cart_id;
    INSERT INTO commerce.outbox(event_type,payload) VALUES ('order.paid', jsonb_build_object('order_id', v_order.id));
    RETURN 'paid';
  ELSIF p_status IN ('CANCELLED','EXPIRED') AND v_order.status IN ('pending','payment_pending') THEN
    UPDATE commerce.stock_reservations SET status = 'released' WHERE order_id = v_order.id AND status = 'active';
    UPDATE commerce.orders SET status = CASE WHEN p_status = 'EXPIRED' THEN 'expired' ELSE 'cancelled' END, cancelled_at = now(), updated_at = now() WHERE id = v_order.id;
    INSERT INTO commerce.order_status_history(order_id, status, note, changed_by)
      VALUES (v_order.id, CASE WHEN p_status = 'EXPIRED' THEN 'expired' ELSE 'cancelled' END, 'Maksekeskus: ' || p_status, NULL);
    RETURN lower(p_status);
  END IF;
  RETURN 'recorded';
END;
$$;

REVOKE ALL ON FUNCTION commerce.process_payment_event(TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.process_payment_event(TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) TO service_role;

-- 4. Update store settings to include notification toggles and a "notifications" field
-- Upsert: update existing row with default notifications if there is no 'notifications' key yet
UPDATE content.settings
SET email = COALESCE(email, '{}'::jsonb) || '{
  "notifications": {
    "notify_pending": true,
    "notify_payment_pending": true,
    "notify_paid": true,
    "notify_processing": true,
    "notify_shipped": true,
    "notify_delivered": true,
    "notify_cancelled": true,
    "notify_payment_failed": true,
    "notify_expired": true,
    "notify_manual_review": true,
    "notify_refunded": true,
    "notify_preorder": true
  }
}'::jsonb
WHERE key = 'store'
  AND (email->'notifications') IS NULL;
