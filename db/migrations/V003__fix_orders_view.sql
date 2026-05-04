-- Fix v_orders_for_analysis to use o.total instead of o.subtotal.
-- The analytics service compares order amounts against payment amounts,
-- so both sides must include tax or neither should — using total ensures
-- the balance calculation is consistent with what customers actually owe.
CREATE OR REPLACE VIEW v_orders_for_analysis AS
SELECT
  o.id          AS order_id,
  u.email       AS customer,
  'cart-order'  AS item,
  o.total       AS amount,
  o.placed_at   AS order_timestamp
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status <> 'cancelled';
