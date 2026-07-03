-- Migration 018: Shipment tracking columns and after-payment shipment registration.
-- Adds shipment_id, tracking_code, and carrier to commerce.orders.

ALTER TABLE commerce.orders
  ADD COLUMN IF NOT EXISTS shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;

CREATE OR REPLACE FUNCTION commerce.shipment_create(
  p_order_id UUID,
  p_carrier TEXT,
  p_shipment_id TEXT,
  p_tracking_code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE commerce.orders
  SET shipment_id = p_shipment_id,
      tracking_code = p_tracking_code,
      shipping_carrier = p_carrier,
      updated_at = now()
  WHERE id = p_order_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION commerce.shipment_create(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION commerce.shipment_create(UUID,TEXT,TEXT,TEXT) TO service_role;
