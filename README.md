# TrendCart — Local Ecommerce

TrendCart is a polished, responsive neighborhood marketplace storefront for discovering fresh produce, bakery goods, pantry essentials and independent local shops.

The project is a front-end storefront demo with no build step, dependency installation or backend requirement.

## Live preview

- GitHub Pages: `https://shivambr0187-hue.github.io/trendcart-local-ecommerce/`
- Optional custom domain: `shop.example.com`

## Features

- Responsive marketplace landing page
- Local shop and category discovery
- Product search and category filters
- Keyboard shortcut (`Ctrl/Cmd + K`) for search
- Interactive shopping cart
- Quantity controls and live subtotal
- Free-delivery threshold calculation
- Browser-based demo checkout
- Customer delivery-details form
- Cash-on-delivery and demo UPI options
- Form validation and order confirmation
- Demo order history saved in local storage
- Favorites and mobile navigation
- Newsletter and partner call-to-action interactions
- Accessible modal, status and focus behavior

## Demo checkout

The checkout is a demonstration only:

1. Add products to the cart.
2. Open the cart and choose **Checkout**.
3. Enter valid delivery details.
4. Select a payment option.
5. Place the demo order.

The order is stored locally in the browser under `trendcart-orders`. It is not sent to a store, saved on a server or used to process real payments.

## Run locally

No package installation is required.

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000>.

You can also open `index.html` directly in a modern browser.

## Deploy to GitHub Pages

1. Open the repository **Settings**.
2. Select **Pages** under **Code and automation**.
3. Set **Source** to **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`.
5. Save and wait for the Pages deployment to finish.

If using a custom domain, add it under **Settings → Pages → Custom domain** and configure its DNS records with the domain provider.

## Project structure

```text
index.html  — Marketplace page structure
styles.css  — Responsive visual design and components
app.js      — Cart, filtering, navigation and demo checkout behavior
README.md   — Project documentation
```

## Current limitations

- Product and shop content is illustrative.
- Checkout and payment processing are demo-only.
- Account, location, inventory and order-management features are not connected to a backend.
- Demo orders remain in the current browser and may be cleared by browser storage settings.
- Images and visual assets may require replacement with licensed production assets.

## Production roadmap

A production store would additionally require:

- A backend and database
- Secure authentication
- Verified customer profiles and addresses
- Real inventory management
- Multi-vendor onboarding and dashboards
- Payment-gateway integration
- Server-side order creation and verification
- Webhooks and refund handling
- Tax, shipping and delivery rules
- Reviews and moderation
- Analytics and SEO metadata

## License

See the repository license before using this demonstration for a commercial project.
