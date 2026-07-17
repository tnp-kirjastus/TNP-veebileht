-- Migration 028: Treat Maksekeskus APPROVED as a successful paid state.
-- The verifier accepts APPROVED and COMPLETED. Settlement must match that
-- accepted state list so confirmed payments do not remain pending.

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
      INSERT INTO commerce.outbox(event_type,payload) VALUES ('payment.manual_reconciliation', jsonb_build_object('order_id', v_order.id, 'reason', 'paid_after_reservation_expiry'));
      RETURN 'manual_review';
    END IF;

    UPDATE commerce.products p SET stock = p.stock - sr.quantity
    FROM commerce.stock_reservations sr
    WHERE sr.order_id = v_order.id AND sr.product_id = p.id
      AND sr.status = 'active' AND sr.expires_at > now() AND p.stock >= sr.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'stock_settlement_failed'; END IF;
    UPDATE commerce.stock_reservations SET status = 'consumed' WHERE order_id = v_order.id AND status = 'active';
    UPDATE commerce.orders SET status = 'paid', updated_at = now() WHERE id = v_order.id;
    DELETE FROM commerce.cart_items WHERE cart_id = v_order.cart_id;
    INSERT INTO commerce.outbox(event_type,payload) VALUES ('order.paid', jsonb_build_object('order_id', v_order.id));
    RETURN 'paid';
  ELSIF p_status IN ('CANCELLED','EXPIRED') AND v_order.status IN ('pending','payment_pending') THEN
    UPDATE commerce.stock_reservations SET status = 'released' WHERE order_id = v_order.id AND status = 'active';
    UPDATE commerce.orders SET status = CASE WHEN p_status = 'EXPIRED' THEN 'expired' ELSE 'cancelled' END, updated_at = now() WHERE id = v_order.id;
    RETURN lower(p_status);
  END IF;
  RETURN 'recorded';
END;
$$;

REVOKE ALL ON FUNCTION commerce.process_payment_event(TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.process_payment_event(TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) TO service_role;
