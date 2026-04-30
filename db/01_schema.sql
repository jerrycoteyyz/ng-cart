-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid(), crypt()

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  name          TEXT          NOT NULL,
  password_hash TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TYPE product_category AS ENUM ('electronics', 'clothing', 'books');

CREATE TABLE products (
  id          BIGINT            PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name        TEXT              NOT NULL,
  description TEXT              NOT NULL DEFAULT '',
  price       NUMERIC(10,2)     NOT NULL CHECK (price >= 0),
  stock       INT               NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT              NOT NULL DEFAULT '',
  category    product_category  NOT NULL,
  rating      NUMERIC(3,2)      CHECK (rating BETWEEN 0 AND 5),
  is_active   BOOLEAN           NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products (category) WHERE is_active;
CREATE INDEX idx_products_price    ON products (price)    WHERE is_active;

-- ============================================================
-- CARTS
-- Belongs to either a logged-in user or an anonymous session,
-- never both at the same time.
-- ============================================================
CREATE TABLE carts (
  id          BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     UUID        REFERENCES users (id) ON DELETE CASCADE,
  session_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cart_owner_check
    CHECK (
      (user_id IS NOT NULL AND session_id IS NULL) OR
      (user_id IS NULL     AND session_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_carts_user    ON carts (user_id)    WHERE user_id    IS NOT NULL;
CREATE UNIQUE INDEX idx_carts_session ON carts (session_id) WHERE session_id IS NOT NULL;

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE cart_items (
  id         BIGINT  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cart_id    BIGINT  NOT NULL REFERENCES carts    (id) ON DELETE CASCADE,
  product_id BIGINT  NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity   INT     NOT NULL CHECK (quantity > 0),

  CONSTRAINT cart_items_unique UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);

-- ============================================================
-- ORDERS
-- Snapshot of totals at checkout — never recomputed from live data.
-- ============================================================
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
);

CREATE TABLE orders (
  id         BIGINT        PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id    UUID          NOT NULL REFERENCES users (id),
  status     order_status  NOT NULL DEFAULT 'pending',
  subtotal   NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tax        NUMERIC(10,2) NOT NULL CHECK (tax >= 0),
  total      NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  tax_rate   NUMERIC(5,4)  NOT NULL,
  placed_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user   ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_placed ON orders (placed_at DESC);

-- ============================================================
-- ORDER ITEMS
-- Snapshot of each line: name and price copied at checkout time.
-- product_id kept as a soft reference (SET NULL on delete) so
-- order history survives product removal.
-- ============================================================
CREATE TABLE order_items (
  id            BIGINT        PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id      BIGINT        NOT NULL REFERENCES orders   (id) ON DELETE CASCADE,
  product_id    BIGINT        REFERENCES products (id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,
  product_image TEXT          NOT NULL DEFAULT '',
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity      INT           NOT NULL CHECK (quantity > 0),
  line_total    NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ============================================================
-- PAYMENTS
-- User payments submitted independently of orders.
-- The Python analytics service reconciles these against order
-- totals to compute each customer's running balance.
-- ============================================================
CREATE TABLE payments (
  id       BIGINT        PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id  UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount   NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note     TEXT,
  paid_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments (user_id);
CREATE INDEX idx_payments_paid ON payments (paid_at DESC);

-- ============================================================
-- ANALYTICS PERSISTENCE
-- Owned by the Python analytics service. Stores the result of
-- each KMeans segmentation run so trends can be tracked over time.
-- ============================================================
CREATE TABLE analysis_runs (
  run_id        SERIAL      PRIMARY KEY,
  source_name   TEXT,
  notes         TEXT,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_segment_results (
  result_id         SERIAL        PRIMARY KEY,
  run_id            INT           NOT NULL REFERENCES analysis_runs (run_id) ON DELETE CASCADE,
  customer          TEXT          NOT NULL,   -- user email, the join key to ng-cart users
  segment_label     TEXT,
  priority          INT,
  action            TEXT,
  severity          TEXT,
  reason            TEXT,
  total_orders      NUMERIC(10,2),
  total_payments    NUMERIC(10,2),
  balance           NUMERIC(10,2),
  order_count       INT,
  payment_count     INT,
  avg_order_value   NUMERIC(10,2),
  avg_payment_value NUMERIC(10,2)
);

CREATE INDEX idx_csr_run      ON customer_segment_results (run_id);
CREATE INDEX idx_csr_customer ON customer_segment_results (customer);
CREATE INDEX idx_csr_action   ON customer_segment_results (action);

-- ============================================================
-- BRIDGE VIEWS FOR THE PYTHON ANALYTICS SERVICE
-- The Python data_service.py queries these views instead of
-- raw tables. They translate ng-cart's relational schema into
-- the flat shape the service expects, using email as the
-- customer identifier shared across both systems.
-- ============================================================
CREATE VIEW v_orders_for_analysis AS
SELECT
  o.id          AS order_id,
  u.email       AS customer,
  'cart-order'  AS item,
  o.total       AS amount,
  o.placed_at   AS order_timestamp
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.status <> 'cancelled';

CREATE VIEW v_payments_for_analysis AS
SELECT
  p.id      AS payment_id,
  u.email   AS customer,
  p.amount,
  p.paid_at AS payment_timestamp
FROM payments p
JOIN users u ON u.id = p.user_id;
