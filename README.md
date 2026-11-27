# TrendCart — Local Ecommerce

TrendCart is a responsive neighborhood marketplace storefront for discovering fresh produce, bakery goods, pantry essentials and independent local shops.

## Run the storefront demo

The static storefront still works without a build step:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>. When using the Node.js server below, the storefront, database-backed product catalog, server-side checkout, and admin panel are served from one origin.

## Node.js backend and admin panel

Requires Node.js 20 or newer. Copy `.env.example` to `.env`, set a unique admin email/password (at least 12 characters), and set a random `SESSION_SECRET` of 32+ characters. Then run:

```bash
npm install
npm start
```

Open:

- Storefront: <http://localhost:3000>
- Admin panel: <http://localhost:3000/admin>

The first server start creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The account is created only once; changing those environment values later does not reset its password. Use a securely managed environment file and never commit real credentials.

### Included functionality

- SQLite database for products, orders, order items, admins, and expiring admin sessions.
- Password hashing with Node.js `scrypt`; signed, HTTP-only, same-site session cookies; rate-limited admin login.
- Admin dashboard to add/edit/hide products and view/update order statuses.
- Product API (`GET /api/products`) used to sync names/prices on the existing storefront.
- Checkout submits customer details and cart quantities to `POST /api/orders`; the server looks up active catalog prices and computes delivery/total itself. Cash-on-delivery is supported. UPI is intentionally not accepted as a real payment method.
- Delivery is ₹40 below a ₹499 subtotal and free at/above ₹499.

**Important first setup:** Products need to exist in the admin catalog before checkout will accept them. Add catalog entries using the exact product names shown by the storefront buttons (for example, `Heirloom tomatoes`, `Slow-fermented sourdough`, `Wildflower raw honey`, and `Seasonal citrus box`) and set your real prices. The frontend disables products that are not in the active catalog. Product data/prices are server-authoritative; prices sent by the browser are ignored.

### Deployment notes

GitHub Pages only serves static files and cannot run this Node.js server. Deploy the app to a Node-capable service (for example, a VPS or Node application host), configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and `NODE_ENV=production`, and use HTTPS. Persist the `data/` directory or configure `DATABASE_FILE` on persistent storage; ephemeral container filesystems can lose the SQLite database. Set `TRUST_PROXY=1` only when deployed behind a trusted reverse proxy. Back up the database regularly. Payment gateway integration, email notifications, vendor accounts, and multi-vendor management are not included.

## API overview

- `GET /api/health` — health check
- `GET /api/products` — active catalog
- `POST /api/orders` — validate and create COD order using database prices
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me` — admin session
- `/api/admin/products` — authenticated catalog management
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:id` — authenticated order management

## Existing static preview

GitHub Pages: <https://shivambr0187-hue.github.io/trendcart-local-ecommerce/>. It remains a static demo; API-backed checkout/admin features require the Node.js deployment.
