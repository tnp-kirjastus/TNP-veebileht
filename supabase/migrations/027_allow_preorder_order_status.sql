-- Migration 027: Allow preorder order status.
-- Checkout and admin order creation can create preorder orders, so the
-- database CHECK constraint must explicitly allow that state.

ALTER TABLE commerce.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE commerce.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'payment_pending',
      'paid',
      'processing',
      'shipped',
      'cancelled',
      'payment_failed',
      'expired',
      'manual_review',
      'refunded',
      'preorder'
    )
  );
