-- ============================================================
-- USERS
-- Passwords hashed via pgcrypto's crypt() with blowfish (bf).
-- Both accounts use the password: devpass123
-- ============================================================
INSERT INTO users (email, name, password_hash) VALUES
  (
    'alice@example.com',
    'Alice Demo',
    crypt('devpass123', gen_salt('bf', 10))
  ),
  (
    'bob@example.com',
    'Bob Demo',
    crypt('devpass123', gen_salt('bf', 10))
  );

-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO products (name, description, price, stock, image_url, category, rating) VALUES

  -- Electronics
  (
    'Wireless Noise-Cancelling Headphones',
    'Over-ear Bluetooth headphones with 30-hour battery life and active noise cancellation.',
    89.99, 42,
    'https://placehold.co/400x400?text=Headphones',
    'electronics', 4.6
  ),
  (
    'Mechanical Keyboard',
    'Tenkeyless mechanical keyboard with Cherry MX Brown switches and RGB backlighting.',
    129.00, 17,
    'https://placehold.co/400x400?text=Keyboard',
    'electronics', 4.4
  ),
  (
    'USB-C Hub (7-in-1)',
    'Multiport adapter with HDMI 4K, 3x USB-A, SD card reader, and 100W power delivery.',
    49.95, 85,
    'https://placehold.co/400x400?text=USB+Hub',
    'electronics', 4.2
  ),

  -- Clothing
  (
    'Classic Crewneck Sweatshirt',
    'Midweight 80% cotton / 20% polyester fleece in a relaxed unisex fit. Machine washable.',
    38.00, 120,
    'https://placehold.co/400x400?text=Sweatshirt',
    'clothing', 4.5
  ),
  (
    'Slim-Fit Chino Trousers',
    'Stretch-cotton chinos with a clean front and five-pocket styling. Available in khaki.',
    54.99, 64,
    'https://placehold.co/400x400?text=Chinos',
    'clothing', 4.1
  ),
  (
    'Waterproof Trail Jacket',
    '2.5-layer hardshell jacket with sealed seams and a helmet-compatible hood.',
    149.00, 23,
    'https://placehold.co/400x400?text=Jacket',
    'clothing', 4.7
  ),

  -- Books
  (
    'Clean Code',
    'A handbook of agile software craftsmanship by Robert C. Martin. Paperback, 431 pages.',
    35.99, 200,
    'https://placehold.co/400x400?text=Clean+Code',
    'books', 4.3
  ),
  (
    'Designing Data-Intensive Applications',
    'Deep dive into the principles behind reliable, scalable distributed systems. By Martin Kleppmann.',
    49.99, 150,
    'https://placehold.co/400x400?text=DDIA',
    'books', 4.8
  ),
  (
    'The Pragmatic Programmer',
    'Classic career guide covering best practices, tooling, and professional habits for developers.',
    39.95, 175,
    'https://placehold.co/400x400?text=Pragmatic',
    'books', 4.5
  );

-- ============================================================
-- SAMPLE ORDERS AND PAYMENTS
-- Gives the Python analytics service real data to segment on
-- first boot. Alice underpays (interesting signal); Bob pays
-- in full (healthy_active signal).
-- ============================================================
DO $$
DECLARE
  alice_id  UUID;
  bob_id    UUID;
  ord_id    BIGINT;
  prod_id   BIGINT;
BEGIN
  SELECT id INTO alice_id FROM users WHERE email = 'alice@example.com';
  SELECT id INTO bob_id   FROM users WHERE email = 'bob@example.com';

  -- Alice: order 1 — headphones, delivered 45 days ago
  SELECT id INTO prod_id FROM products WHERE name = 'Wireless Noise-Cancelling Headphones';
  INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate, placed_at, updated_at)
  VALUES (alice_id, 'delivered', 89.99, 7.20, 97.19, 0.0800,
          NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days')
  RETURNING id INTO ord_id;
  INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
  VALUES (ord_id, prod_id, 'Wireless Noise-Cancelling Headphones',
          'https://placehold.co/400x400?text=Headphones', 89.99, 1);

  -- Alice: order 2 — keyboard, delivered 15 days ago
  SELECT id INTO prod_id FROM products WHERE name = 'Mechanical Keyboard';
  INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate, placed_at, updated_at)
  VALUES (alice_id, 'delivered', 129.00, 10.32, 139.32, 0.0800,
          NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days')
  RETURNING id INTO ord_id;
  INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
  VALUES (ord_id, prod_id, 'Mechanical Keyboard',
          'https://placehold.co/400x400?text=Keyboard', 129.00, 1);

  -- Alice: only paid for the first order — leaves $139.32 outstanding
  INSERT INTO payments (user_id, amount, note, paid_at)
  VALUES (alice_id, 97.19, 'Payment — headphones order', NOW() - INTERVAL '42 days');

  -- Bob: order 1 — Clean Code, delivered 20 days ago
  SELECT id INTO prod_id FROM products WHERE name = 'Clean Code';
  INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate, placed_at, updated_at)
  VALUES (bob_id, 'delivered', 35.99, 2.88, 38.87, 0.0800,
          NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days')
  RETURNING id INTO ord_id;
  INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
  VALUES (ord_id, prod_id, 'Clean Code',
          'https://placehold.co/400x400?text=Clean+Code', 35.99, 1);

  -- Bob: order 2 — DDIA, delivered 10 days ago
  SELECT id INTO prod_id FROM products WHERE name = 'Designing Data-Intensive Applications';
  INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate, placed_at, updated_at)
  VALUES (bob_id, 'delivered', 49.99, 4.00, 53.99, 0.0800,
          NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO ord_id;
  INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
  VALUES (ord_id, prod_id, 'Designing Data-Intensive Applications',
          'https://placehold.co/400x400?text=DDIA', 49.99, 1);

  -- Bob: paid both orders in full — balanced customer
  INSERT INTO payments (user_id, amount, note, paid_at)
  VALUES (bob_id, 38.87, 'Payment — Clean Code order',  NOW() - INTERVAL '18 days');
  INSERT INTO payments (user_id, amount, note, paid_at)
  VALUES (bob_id, 53.99, 'Payment — DDIA order',        NOW() - INTERVAL '8 days');
END $$;
