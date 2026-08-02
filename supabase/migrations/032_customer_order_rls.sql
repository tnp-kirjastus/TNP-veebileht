-- Customer order visibility is based on the authenticated user's order link.
-- This migration is intentionally separate from the already-applied account migration.

ALTER TABLE commerce.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers read own orders" ON commerce.orders;
CREATE POLICY "Customers read own orders" ON commerce.orders
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers read own order items" ON commerce.order_items;
CREATE POLICY "Customers read own order items" ON commerce.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM commerce.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users read own order history" ON commerce.order_status_history;
CREATE POLICY "Users read own order history" ON commerce.order_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM commerce.orders o
      WHERE o.id = order_status_history.order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

GRANT SELECT ON commerce.orders, commerce.order_items, commerce.order_status_history TO authenticated;
