const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const dbFile = path.resolve(process.env.DATABASE_FILE || path.join(ROOT, 'data/trendcart.sqlite'));
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-secret-change-before-deploy');
if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL CHECK(price >= 0), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', address TEXT NOT NULL, payment TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', subtotal INTEGER NOT NULL, delivery INTEGER NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL);
`);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expectedHex] = String(stored).split(':');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function sign(value) { return crypto.createHmac('sha256', sessionSecret).update(value).digest('hex'); }
function safeEqual(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || '');
if (adminEmail && adminPassword) {
  if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  db.prepare('INSERT OR IGNORE INTO admins (email, password_hash) VALUES (?, ?)').run(adminEmail, hashPassword(adminPassword));
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD before starting in production.');
}

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https:'], connectSrc: ["'self'"] } } }));
app.use(express.json({ limit: '32kb' }));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many login attempts. Try again later.' } });

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const entry = raw.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : '';
}
function requireAdmin(req, res, next) {
  const cookie = readCookie(req, 'trendcart_session');
  const [token, signature] = cookie.split('.');
  if (!token || !signature || !safeEqual(signature, sign(token))) return res.status(401).json({ error: 'Please sign in.' });
  const session = db.prepare('SELECT admins.id, admins.email FROM sessions JOIN admins ON admins.id = sessions.admin_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?').get(digest(token), Date.now());
  if (!session) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  req.admin = session;
  next();
}
function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
function productView(row) { return { id: row.id, name: row.name, category: row.category, description: row.description, price: row.price, active: Boolean(row.active) }; }
function orderView(row) {
  return { id: row.public_id, customer: { name: row.customer_name, phone: row.phone, email: row.email, address: row.address }, payment: row.payment, status: row.status, subtotal: row.subtotal, delivery: row.delivery, total: row.total, createdAt: row.created_at, items: db.prepare('SELECT product_name AS name, quantity, unit_price AS price FROM order_items WHERE order_id = ? ORDER BY id').all(row.id) };
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT id, name, category, description, price, active FROM products WHERE active = 1 ORDER BY name COLLATE NOCASE').all();
  res.json({ products: products.map(productView) });
});
app.post('/api/orders', (req, res) => {
  const customer = req.body && req.body.customer;
  const name = cleanString(customer && customer.name, 100);
  const phone = cleanString(customer && customer.phone, 32);
  const email = cleanString(customer && customer.email, 254);
  const address = cleanString(customer && customer.address, 500);
  const payment = req.body && req.body.payment === 'cod' ? 'Cash on delivery' : '';
  const items = req.body && req.body.items;
  if (!name || !/^\+?[0-9 ()-]{7,20}$/.test(phone) || !address || !payment || !Array.isArray(items) || items.length < 1 || items.length > 30) return res.status(400).json({ error: 'Please provide valid customer details, cash-on-delivery payment, and 1–30 cart items.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const requested = new Map();
  for (const item of items) {
    const itemName = cleanString(item && item.name, 120);
    const quantity = Number(item && item.quantity);
    if (!itemName || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return res.status(400).json({ error: 'Cart contains an invalid product or quantity.' });
    requested.set(itemName.toLowerCase(), (requested.get(itemName.toLowerCase()) || 0) + quantity);
  }
  if ([...requested.values()].some(quantity => quantity > 99)) return res.status(400).json({ error: 'Maximum quantity per product is 99.' });
  const transaction = db.transaction(() => {
    const resolved = [];
    for (const [itemName, quantity] of requested) {
      const product = db.prepare('SELECT id, name, price FROM products WHERE active = 1 AND name = ? COLLATE NOCASE').get(itemName);
      if (!product) throw new Error(`Product unavailable: ${itemName}`);
      resolved.push({ ...product, quantity });
    }
    const subtotal = resolved.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const delivery = subtotal >= 499 ? 0 : 40;
    const publicId = `TC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const inserted = db.prepare('INSERT INTO orders (public_id, customer_name, phone, email, address, payment, subtotal, delivery, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(publicId, name, phone, email, address, payment, subtotal, delivery, subtotal + delivery);
    const addItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)');
    for (const item of resolved) addItem.run(inserted.lastInsertRowid, item.id, item.name, item.quantity, item.price);
    return { publicId, subtotal, delivery, total: subtotal + delivery };
  });
  try { res.status(201).json({ order: transaction() }); }
  catch (error) { res.status(400).json({ error: error.message.startsWith('Product unavailable:') ? error.message : 'Could not create order.' }); }
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const email = cleanString(req.body && req.body.email, 254).toLowerCase();
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';
  const admin = db.prepare('SELECT id, email, password_hash FROM admins WHERE email = ?').get(email);
  if (!admin || !verifyPassword(password, admin.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').run(digest(token), admin.id, expiresAt);
  res.cookie('trendcart_session', `${token}.${sign(token)}`, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000, path: '/' });
  res.json({ admin: { email: admin.email } });
});
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const [token] = readCookie(req, 'trendcart_session').split('.');
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
  res.clearCookie('trendcart_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
  res.json({ ok: true });
});
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ admin: { email: req.admin.email } }));
app.get('/api/admin/products', requireAdmin, (_req, res) => res.json({ products: db.prepare('SELECT id, name, category, description, price, active FROM products ORDER BY id DESC').all().map(productView) }));
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const name = cleanString(req.body && req.body.name, 120);
  const category = cleanString(req.body && req.body.category, 60);
  const description = cleanString(req.body && req.body.description, 500);
  const price = Number(req.body && req.body.price);
  if (!name || !category || !Number.isSafeInteger(price) || price < 0 || price > 10000000) return res.status(400).json({ error: 'Product name, category, and a valid price in rupees are required.' });
  try {
    const result = db.prepare('INSERT INTO products (name, category, description, price) VALUES (?, ?, ?, ?)').run(name, category, description, price);
    res.status(201).json({ product: productView(db.prepare('SELECT id, name, category, description, price, active FROM products WHERE id = ?').get(result.lastInsertRowid)) });
  } catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 400).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'A product with this name already exists.' : 'Could not create product.' }); }
});
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  const name = cleanString(req.body && req.body.name, 120);
  const category = cleanString(req.body && req.body.category, 60);
  const description = cleanString(req.body && req.body.description, 500);
  const price = Number(req.body && req.body.price);
  const active = req.body && req.body.active === false ? 0 : 1;
  if (!name || !category || !Number.isSafeInteger(price) || price < 0 || price > 10000000) return res.status(400).json({ error: 'Product name, category, and a valid price in rupees are required.' });
  try {
    db.prepare("UPDATE products SET name = ?, category = ?, description = ?, price = ?, active = ?, updated_at = datetime('now') WHERE id = ?").run(name, category, description, price, active, id);
    res.json({ product: productView(db.prepare('SELECT id, name, category, description, price, active FROM products WHERE id = ?').get(id)) });
  } catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 400).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'A product with this name already exists.' : 'Could not update product.' }); }
});
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const result = db.prepare('UPDATE products SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: 'Product not found.' });
  res.status(204).end();
});
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 500').all();
  res.json({ orders: rows.map(orderView) });
});
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const allowed = new Set(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']);
  const status = cleanString(req.body && req.body.status, 32);
  if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid order status.' });
  const result = db.prepare('UPDATE orders SET status = ? WHERE public_id = ?').run(status, cleanString(req.params.id, 32));
  if (!result.changes) return res.status(404).json({ error: 'Order not found.' });
  res.json({ ok: true });
});

app.get('/storefront.js', (_req, res) => res.type('application/javascript').send(fs.readFileSync(path.join(ROOT, 'public/storefront.js'), 'utf8')));
app.get('/app.js', (_req, res, next) => {
  fs.readFile(path.join(ROOT, 'app.js'), 'utf8', (error, source) => {
    if (error) return next(error);
    res.type('application/javascript').send(`${source}\nwindow.__trendcartCart = () => [...cart.entries()].map(([name, item]) => ({ name, quantity: item.quantity }));\n`);
  });
});
app.get('/admin', (_req, res) => res.sendFile(path.join(ROOT, 'public/admin.html')));
app.get('/', (_req, res, next) => {
  fs.readFile(path.join(ROOT, 'index.html'), 'utf8', (error, html) => {
    if (error) return next(error);
    const withAdapter = html.replace('</body>', '  <script src="/storefront.js" defer></script>\n</body>');
    res.type('html').send(withAdapter);
  });
});
app.use(express.static(ROOT, { index: false, dotfiles: 'ignore' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const server = app.listen(PORT, () => console.log(`TrendCart server listening on http://localhost:${PORT}`));
function shutdown() { server.close(() => { db.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
