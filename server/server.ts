import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { pool } from './db';

const app = express();

const ALLOWED_ORIGIN = process.env['ALLOWED_ORIGIN'] || 'http://localhost:4200';
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

const JWT_SECRET = process.env['JWT_SECRET'] || 'dev-secret-change-before-deploying';
const TAX_RATE   = 0.08;

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as jwt.JwtPayload;
    (req as express.Request & { user: jwt.JwtPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    // pgcrypto's crypt() rehashes the input using the salt already embedded in
    // password_hash, so Postgres does the bcrypt comparison — no npm package needed.
    const result = await pool.query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name
       FROM users
       WHERE email = $1
         AND password_hash = crypt($2, password_hash)`,
      [email, password],
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ── GET /api/products ────────────────────────────────────────────────────────
app.get('/api/products', requireAuth, async (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };

  try {
    let queryText = `
      SELECT id, name, description, price, stock, image_url, category, rating
      FROM products
      WHERE is_active = true`;
    const params: unknown[] = [];

    if (category && category !== 'all') {
      params.push(category);
      queryText += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      queryText += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    queryText += ' ORDER BY id';

    const result = await pool.query<{
      id: string; name: string; description: string; price: string;
      stock: number; image_url: string; category: string; rating: string | null;
    }>(queryText, params);

    const data = result.rows.map(p => ({
      id:          Number(p.id),
      name:        p.name,
      description: p.description,
      price:       Number(p.price),
      stock:       Number(p.stock),
      imageUrl:    p.image_url,
      category:    p.category,
      rating:      p.rating != null ? Number(p.rating) : 0,
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error('[get-products]', err);
    res.status(500).json({ message: 'Failed to load products' });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
app.get('/api/products/:id', requireAuth, async (req, res) => {
  const productId = Number(req.params['id']);

  if (isNaN(productId)) {
    res.status(400).json({ message: 'Invalid product id' });
    return;
  }

  try {
    const result = await pool.query<{
      id: string; name: string; description: string; price: string;
      stock: number; image_url: string; category: string; rating: string | null;
    }>(
      `SELECT id, name, description, price, stock, image_url, category, rating
       FROM products WHERE id = $1 AND is_active = true`,
      [productId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const p = result.rows[0];
    res.json({
      product: {
        id:          Number(p.id),
        name:        p.name,
        description: p.description,
        price:       Number(p.price),
        stock:       Number(p.stock),
        imageUrl:    p.image_url,
        category:    p.category,
        rating:      p.rating != null ? Number(p.rating) : 0,
      },
    });
  } catch (err) {
    console.error('[get-product]', err);
    res.status(500).json({ message: 'Failed to load product' });
  }
});

// ── POST /api/orders ─────────────────────────────────────────────────────────
// Runs as a single database transaction:
//   1. Lock product rows (FOR UPDATE) to prevent overselling under concurrency
//   2. Validate stock for every line item
//   3. Re-read prices from DB — never trust amounts sent from the browser
//   4. INSERT orders + order_items
//   5. Decrement stock
//   ROLLBACK on any failure so the DB is never left in a partial state.
interface CartItem {
  product: { id: number; name: string };
  quantity: number;
}

app.post('/api/orders', requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub as string;
  const { shipping, items, deferred } = req.body as {
    shipping: unknown; items: CartItem[]; deferred?: boolean;
  };

  if (!items?.length) {
    res.status(400).json({ message: 'Cart is empty' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch current prices and lock rows against concurrent updates
    const productIds = items.map(i => i.product.id);
    const productsResult = await client.query<{
      id: number; name: string; price: string; image_url: string; stock: number;
    }>(
      `SELECT id, name, price, image_url, stock
       FROM products
       WHERE id = ANY($1) AND is_active = true
       FOR UPDATE`,
      [productIds],
    );

    const productMap = new Map(productsResult.rows.map(p => [Number(p.id), p]));

    // Validate every line item before touching anything
    for (const item of items) {
      const product = productMap.get(item.product.id);
      if (!product) {
        await client.query('ROLLBACK');
        res.status(409).json({ message: `Product no longer available: ${item.product.name}` });
        return;
      }
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        res.status(409).json({
          message: `Insufficient stock for "${product.name}" — only ${product.stock} left`,
        });
        return;
      }
    }

    // Calculate totals from DB prices — client-supplied prices are ignored
    const subtotal = items.reduce((sum, item) => {
      return sum + Number(productMap.get(item.product.id)!.price) * item.quantity;
    }, 0);
    const tax   = subtotal * TAX_RATE;
    const total = subtotal + tax;

    // Create the order record
    const orderResult = await client.query<{ id: number }>(
      `INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate)
       VALUES ($1, 'confirmed', $2, $3, $4, $5)
       RETURNING id`,
      [userId, subtotal.toFixed(2), tax.toFixed(2), total.toFixed(2), TAX_RATE],
    );
    const orderId = orderResult.rows[0].id;

    // Insert each line item and decrement stock atomically
    for (const item of items) {
      const product = productMap.get(item.product.id)!;

      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, product_image, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, product.id, product.name, product.image_url, product.price, item.quantity],
      );

      await client.query(
        `UPDATE products
         SET stock = CASE
               WHEN (stock - $1) < 5 THEN (stock - $1) + 20
               ELSE stock - $1
             END,
             updated_at = now()
         WHERE id = $2`,
        [item.quantity, product.id],
      );
    }

    if (!deferred) {
      await client.query(
        `INSERT INTO payments (user_id, amount, note) VALUES ($1, $2, 'Payment at checkout')`,
        [userId, total.toFixed(2)],
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ orderId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[create-order]', err);
    res.status(500).json({ message: 'Failed to place order. Please try again.' });
  } finally {
    client.release();
  }
});

// ── GET /api/orders ──────────────────────────────────────────────────────────
// Returns all orders for the logged-in user, newest first, with their line items.
app.get('/api/orders', requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub as string;

  try {
    const ordersResult = await pool.query<{
      id: number; status: string; subtotal: string; tax: string;
      total: string; placed_at: Date;
    }>(
      `SELECT id, status, subtotal, tax, total, placed_at
       FROM orders
       WHERE user_id = $1
       ORDER BY placed_at DESC`,
      [userId],
    );

    if (ordersResult.rows.length === 0) {
      res.json({ orders: [] });
      return;
    }

    const orderIds = ordersResult.rows.map(o => Number(o.id));
    const itemsResult = await pool.query<{
      order_id: number; product_name: string; product_image: string;
      unit_price: string; quantity: number; line_total: string;
    }>(
      `SELECT order_id, product_name, product_image, unit_price, quantity, line_total
       FROM order_items
       WHERE order_id = ANY($1)
       ORDER BY id`,
      [orderIds],
    );

    // Group items under their parent order
    const itemsByOrder = new Map<number, typeof itemsResult.rows>();
    for (const item of itemsResult.rows) {
      const key = Number(item.order_id);
      if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
      itemsByOrder.get(key)!.push(item);
    }

    const orders = ordersResult.rows.map(o => ({
      id:        Number(o.id),
      status:    o.status,
      subtotal:  Number(o.subtotal),
      tax:       Number(o.tax),
      total:     Number(o.total),
      placedAt:  o.placed_at,
      items: (itemsByOrder.get(Number(o.id)) ?? []).map(i => ({
        productName:  i.product_name,
        productImage: i.product_image,
        unitPrice:    Number(i.unit_price),
        quantity:     i.quantity,
        lineTotal:    Number(i.line_total),
      })),
    }));

    res.json({ orders });
  } catch (err) {
    console.error('[get-orders]', err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
// Single order — used by the confirmation page.
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const userId  = (req as any).user?.sub as string;
  const orderId = Number(req.params['id']);

  if (isNaN(orderId)) {
    res.status(400).json({ message: 'Invalid order id' });
    return;
  }

  try {
    const orderResult = await pool.query<{
      id: number; status: string; subtotal: string; tax: string;
      total: string; placed_at: Date;
    }>(
      `SELECT id, status, subtotal, tax, total, placed_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId],
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const itemsResult = await pool.query<{
      product_name: string; product_image: string;
      unit_price: string; quantity: number; line_total: string;
    }>(
      `SELECT product_name, product_image, unit_price, quantity, line_total
       FROM order_items WHERE order_id = $1 ORDER BY id`,
      [orderId],
    );

    const o = orderResult.rows[0];
    res.json({
      order: {
        id:       Number(o.id),
        status:   o.status,
        subtotal: Number(o.subtotal),
        tax:      Number(o.tax),
        total:    Number(o.total),
        placedAt: o.placed_at,
        items: itemsResult.rows.map(i => ({
          productName:  i.product_name,
          productImage: i.product_image,
          unitPrice:    Number(i.unit_price),
          quantity:     i.quantity,
          lineTotal:    Number(i.line_total),
        })),
      },
    });
  } catch (err) {
    console.error('[get-order]', err);
    res.status(500).json({ message: 'Failed to load order' });
  }
});

// ── GET /api/balance ─────────────────────────────────────────────────────────
// Returns the logged-in user's running balance: total orders minus total payments.
// A positive balance means the customer owes money; negative means they have credit.
app.get('/api/balance', requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub as string;

  try {
    const result = await pool.query<{ total_orders: string; total_payments: string }>(
      `SELECT
         COALESCE((SELECT SUM(total)  FROM orders   WHERE user_id = $1 AND status <> 'cancelled'), 0) AS total_orders,
         COALESCE((SELECT SUM(amount) FROM payments WHERE user_id = $1), 0)                           AS total_payments`,
      [userId],
    );

    const totalOrders   = Number(result.rows[0].total_orders);
    const totalPayments = Number(result.rows[0].total_payments);
    res.json({ balance: totalOrders - totalPayments, totalOrders, totalPayments });
  } catch (err) {
    console.error('[get-balance]', err);
    res.status(500).json({ message: 'Failed to load balance' });
  }
});

// ── POST /api/payments ────────────────────────────────────────────────────────
app.post('/api/payments', requireAuth, async (req, res) => {
  const userId = (req as any).user?.sub as string;
  const { amount, note } = req.body as { amount?: number; note?: string };

  if (!amount || amount <= 0) {
    res.status(400).json({ message: 'Payment amount must be greater than zero' });
    return;
  }

  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO payments (user_id, amount, note) VALUES ($1, $2, $3) RETURNING id`,
      [userId, Number(amount).toFixed(2), note || null],
    );
    res.status(201).json({ paymentId: Number(result.rows[0].id) });
  } catch (err) {
    console.error('[create-payment]', err);
    res.status(500).json({ message: 'Failed to record payment' });
  }
});

// ── POST /api/dev/add-customers ──────────────────────────────────────────────
// Adds 5 sequential generated customers, continuing from the last one created.
app.post('/api/dev/add-customers', requireAuth, async (_req, res) => {
  try {
    const lastResult = await pool.query<{ max: string }>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(email FROM 'customer_(\\d+)@') AS INTEGER)), 0) AS max
       FROM users WHERE email ~ '^customer_\\d+@ngcart\\.dev$'`,
    );
    const startNum = Number(lastResult.rows[0].max) + 1;

    const added: { email: string; name: string }[] = [];
    for (let i = startNum; i < startNum + 5; i++) {
      const num   = String(i).padStart(4, '0');
      const email = `customer_${num}@ngcart.dev`;
      const name  = `Customer ${num}`;
      await pool.query(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, crypt('devpass123', gen_salt('bf', 10)))`,
        [email, name],
      );
      added.push({ email, name });
    }
    res.json({ added });
  } catch (err) {
    console.error('[add-customers]', err);
    res.status(500).json({ message: 'Failed to add customers' });
  }
});

// ── POST /api/dev/add-orders ──────────────────────────────────────────────────
// For a random 20% of customers, creates an order with 1–5 random products.
app.post('/api/dev/add-orders', requireAuth, async (_req, res) => {
  try {
    const customersResult = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users
       ORDER BY RANDOM()
       LIMIT GREATEST(1, (SELECT COUNT(*)::int FROM users) / 5)`,
    );

    const productsResult = await pool.query<{
      id: string; name: string; price: string; image_url: string; stock: number;
    }>(`SELECT id, name, price, image_url, stock FROM products WHERE is_active = true AND stock > 0`);

    const products = productsResult.rows;
    if (!products.length) {
      res.status(409).json({ message: 'No products in stock' });
      return;
    }

    const created: { orderId: number; customer: string; total: string }[] = [];

    for (const customer of customersResult.rows) {
      const numItems  = Math.floor(Math.random() * 5) + 1;
      const shuffled  = [...products].sort(() => Math.random() - 0.5);
      const selected  = shuffled.slice(0, Math.min(numItems, shuffled.length));

      let subtotal = 0;
      const lines = selected.map(p => {
        const qty = Math.floor(Math.random() * 3) + 1;
        subtotal += Number(p.price) * qty;
        return { product: p, quantity: qty };
      });

      const tax   = subtotal * TAX_RATE;
      const total = subtotal + tax;

      const orderResult = await pool.query<{ id: number }>(
        `INSERT INTO orders (user_id, status, subtotal, tax, total, tax_rate)
         VALUES ($1, 'confirmed', $2, $3, $4, $5) RETURNING id`,
        [customer.id, subtotal.toFixed(2), tax.toFixed(2), total.toFixed(2), TAX_RATE],
      );
      const orderId = orderResult.rows[0].id;

      for (const line of lines) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, line.product.id, line.product.name, line.product.image_url, line.product.price, line.quantity],
        );
        await pool.query(
          `UPDATE products
           SET stock = CASE WHEN (stock - $1) < 5 THEN (stock - $1) + 20 ELSE stock - $1 END,
               updated_at = now()
           WHERE id = $2`,
          [line.quantity, line.product.id],
        );
      }

      created.push({ orderId: Number(orderId), customer: customer.email, total: total.toFixed(2) });
    }

    res.json({ ordersCreated: created.length, orders: created });
  } catch (err) {
    console.error('[add-orders]', err);
    res.status(500).json({ message: 'Failed to add orders' });
  }
});

// ── POST /api/dev/add-payments ────────────────────────────────────────────────
// For a random 20% of customers, records a payment of 30–200% of their balance.
// Customers with no balance receive a $200 payment.
app.post('/api/dev/add-payments', requireAuth, async (_req, res) => {
  try {
    const customersResult = await pool.query<{ id: string; email: string; balance: string }>(
      `SELECT u.id, u.email,
         COALESCE((SELECT SUM(total)  FROM orders   WHERE user_id = u.id AND status <> 'cancelled'), 0) -
         COALESCE((SELECT SUM(amount) FROM payments WHERE user_id = u.id), 0) AS balance
       FROM users u
       ORDER BY RANDOM()
       LIMIT GREATEST(1, (SELECT COUNT(*)::int FROM users) / 5)`,
    );

    const created: { customer: string; balance: string; paid: string }[] = [];

    for (const customer of customersResult.rows) {
      const balance = Number(customer.balance);
      const pct     = 0.3 + Math.random() * 1.7;
      const amount  = balance > 0
        ? Math.round(balance * pct * 100) / 100
        : 200;

      await pool.query(
        `INSERT INTO payments (user_id, amount, note) VALUES ($1, $2, 'Generated payment')`,
        [customer.id, amount.toFixed(2)],
      );

      created.push({ customer: customer.email, balance: balance.toFixed(2), paid: amount.toFixed(2) });
    }

    res.json({ paymentsCreated: created.length, payments: created });
  } catch (err) {
    console.error('[add-payments]', err);
    res.status(500).json({ message: 'Failed to add payments' });
  }
});

const PORT = Number(process.env['PORT'] || 3000);
app.listen(PORT, () => console.log(`API server listening on :${PORT}`));
