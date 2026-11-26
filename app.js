const cart = new Map();
const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const countEl = document.getElementById('cart-count');
const drawerCount = document.getElementById('drawer-count');
const cartItems = document.getElementById('cart-items');
const cartSummary = document.getElementById('cart-summary');
const toast = document.getElementById('toast');
let toastTimer;
let lastFocusedElement;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function itemCount() {
  return [...cart.values()].reduce((total, item) => total + item.quantity, 0);
}
function cartSubtotal() {
  return [...cart.values()].reduce((total, item) => total + item.price * item.quantity, 0);
}
function renderCart() {
  const count = itemCount();
  countEl.textContent = count;
  drawerCount.textContent = `(${count})`;
  if (!count) {
    cartItems.innerHTML = '<div class="empty-cart"><span>🛍️</span><h3>Room for something lovely.</h3><p>Your local finds will show up here.</p><button class="button button-primary" id="empty-cart-browse" type="button">Explore local finds</button></div>';
    cartSummary.hidden = true;
    document.getElementById('empty-cart-browse').addEventListener('click', closeCart);
    return;
  }
  cartSummary.hidden = false;
  cartItems.innerHTML = [...cart.entries()].map(([name, item]) => `<div class="cart-row"><div class="cart-row-thumb" aria-hidden="true">${item.emoji}</div><div class="cart-row-info"><strong>${name}</strong><span>₹${currency.format(item.price)} each</span><div class="cart-quantity"><button type="button" data-action="decrease" data-name="${name}" aria-label="Decrease ${name} quantity">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-name="${name}" aria-label="Increase ${name} quantity">+</button></div></div><strong class="cart-row-price">₹${currency.format(item.price * item.quantity)}</strong></div>`).join('');
  document.getElementById('cart-subtotal').textContent = `₹${currency.format(cartSubtotal())}`;
  cartItems.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
    const item = cart.get(button.dataset.name);
    if (!item) return;
    item.quantity += button.dataset.action === 'increase' ? 1 : -1;
    if (item.quantity <= 0) cart.delete(button.dataset.name);
    renderCart();
  }));
}
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('drawer-close').focus();
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

const checkoutStyles = document.createElement('style');
checkoutStyles.textContent = `
.checkout-overlay{position:fixed;inset:0;z-index:1000;background:rgba(15,27,48,.58);display:grid;place-items:center;padding:18px;overflow:auto}
.checkout-dialog{width:min(100%,680px);max-height:min(92vh,900px);overflow:auto;background:#fff;border-radius:20px;padding:clamp(20px,4vw,36px);box-shadow:0 24px 80px rgba(0,0,0,.24);color:#17243c;font-family:'DM Sans',sans-serif}
.checkout-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px}.checkout-top h2{margin:4px 0 0;font:700 28px 'Manrope',sans-serif}.checkout-top p{margin:7px 0;color:#758097;font-size:14px}.checkout-close{border:0;background:#f2f4f7;border-radius:50%;width:40px;height:40px;font-size:23px;cursor:pointer;color:#17243c}
.checkout-section{border-top:1px solid #e9edf2;padding-top:18px;margin-top:18px}.checkout-section h3{margin:0 0 14px;font-size:16px}.checkout-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.checkout-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}.checkout-field.full{grid-column:1/-1}.checkout-field label{font-size:12px;font-weight:700;color:#46536b}.checkout-field input,.checkout-field textarea{width:100%;border:1px solid #dfe4eb;border-radius:9px;padding:12px;font:inherit;color:#17243c;background:#fff}.checkout-field input:focus,.checkout-field textarea:focus{outline:2px solid #f2a13b;outline-offset:1px}.checkout-field textarea{min-height:76px;resize:vertical}.checkout-payment{display:grid;gap:9px}.checkout-payment label{border:1px solid #e2e7ee;border-radius:10px;padding:12px;display:flex;gap:10px;align-items:flex-start;cursor:pointer}.checkout-payment small{display:block;color:#758097;margin-top:3px}.checkout-total{background:#fbfaf7;border-radius:12px;padding:14px;margin-top:18px}.checkout-total div{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}.checkout-total .grand{border-top:1px solid #e4e6e8;margin-top:7px;padding-top:12px;font-weight:800;font-size:17px}.checkout-submit{width:100%;margin-top:16px;padding:14px;border:0;border-radius:10px;background:#13284e;color:white;font:700 15px inherit;cursor:pointer}.checkout-submit:hover{background:#203b68}.checkout-note{font-size:12px;line-height:1.5;color:#758097;margin:10px 0 0}.checkout-error{color:#a32b25;font-size:13px;margin:10px 0 0}.checkout-success{text-align:center;padding:26px 8px}.checkout-success .success-icon{font-size:50px}.checkout-success h2{font:700 27px 'Manrope',sans-serif;margin:12px 0 8px}.checkout-success p{line-height:1.6;color:#59657a}.checkout-success button{margin-top:14px}@media(max-width:560px){.checkout-grid{grid-template-columns:1fr}.checkout-field.full{grid-column:auto}.checkout-dialog{padding:20px}.checkout-top h2{font-size:24px}}
`;
document.head.append(checkoutStyles);

function closeCheckout() {
  document.getElementById('checkout-overlay')?.remove();
  document.body.style.overflow = '';
  lastFocusedElement?.focus();
}
function savedOrders() {
  try { return JSON.parse(localStorage.getItem('trendcart-orders') || '[]'); }
  catch { return []; }
}
function openCheckout() {
  if (!itemCount()) {
    showToast('Add something to your cart before checkout.');
    return;
  }
  closeCart();
  lastFocusedElement = document.getElementById('checkout-button');
  const subtotal = cartSubtotal();
  const delivery = subtotal >= 499 ? 0 : 40;
  const overlay = document.createElement('div');
  overlay.className = 'checkout-overlay';
  overlay.id = 'checkout-overlay';
  overlay.innerHTML = `<section class="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div class="checkout-top"><div><small style="letter-spacing:.12em;color:#63866b;font-weight:700">TREND CART CHECKOUT</small><h2 id="checkout-title">Almost yours.</h2><p>Share your delivery details to place this demo order.</p></div><button class="checkout-close" type="button" aria-label="Close checkout">×</button></div><form id="checkout-form" novalidate><div class="checkout-section"><h3>Delivery details</h3><div class="checkout-grid"><div class="checkout-field"><label for="checkout-name">Full name *</label><input id="checkout-name" name="name" autocomplete="name" required maxlength="80"></div><div class="checkout-field"><label for="checkout-phone">Phone number *</label><input id="checkout-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required pattern="[0-9+() -]{8,18}" maxlength="18"></div><div class="checkout-field full"><label for="checkout-email">Email (optional)</label><input id="checkout-email" name="email" type="email" autocomplete="email" maxlength="120"></div><div class="checkout-field full"><label for="checkout-address">Delivery address *</label><textarea id="checkout-address" name="address" autocomplete="street-address" required maxlength="300" placeholder="House/flat, street, area, city and PIN code"></textarea></div></div></div><div class="checkout-section"><h3>Payment method</h3><div class="checkout-payment"><label><input type="radio" name="payment" value="cod" checked><span><strong>Cash on delivery</strong><small>Pay your local delivery partner when your order arrives.</small></span></label><label><input type="radio" name="payment" value="upi-demo"><span><strong>UPI (demo only)</strong><small>No payment will be collected; this option is for preview only.</small></span></label></div></div><div class="checkout-total"><div><span>Subtotal (${itemCount()} items)</span><strong>₹${currency.format(subtotal)}</strong></div><div><span>Delivery</span><strong>${delivery ? `₹${currency.format(delivery)}` : 'FREE'}</strong></div><div class="grand"><span>Total</span><strong>₹${currency.format(subtotal + delivery)}</strong></div></div><p class="checkout-error" id="checkout-error" role="alert" hidden></p><button class="checkout-submit" type="submit">Place demo order · ₹${currency.format(subtotal + delivery)}</button><p class="checkout-note">This is a storefront demo. It does not process payments or send orders to a store. Your details are saved only in this browser as part of the demo order.</p></form></section>`;
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.checkout-close').addEventListener('click', closeCheckout);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeCheckout(); });
  overlay.querySelector('#checkout-name').focus();
  overlay.querySelector('#checkout-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = overlay.querySelector('#checkout-error');
    error.hidden = true;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const order = {
      id: `TC-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString(),
      customer: { name: String(data.get('name')).trim(), phone: String(data.get('phone')).trim(), email: String(data.get('email')).trim(), address: String(data.get('address')).trim() },
      payment: data.get('payment') === 'cod' ? 'Cash on delivery' : 'UPI demo (not paid)',
      items: [...cart.entries()].map(([name, item]) => ({ name, price: item.price, quantity: item.quantity })),
      subtotal,
      delivery,
      total: subtotal + delivery
    };
    try {
      const orders = savedOrders();
      orders.unshift(order);
      localStorage.setItem('trendcart-orders', JSON.stringify(orders.slice(0, 20)));
    } catch {
      error.textContent = 'Could not save this demo order in your browser. Please check local storage settings and try again.';
      error.hidden = false;
      return;
    }
    cart.clear();
    renderCart();
    overlay.querySelector('.checkout-dialog').innerHTML = `<div class="checkout-success"><div class="success-icon" aria-hidden="true">🌿</div><small style="letter-spacing:.12em;color:#63866b;font-weight:700">ORDER PLACED</small><h2>Thank you, ${order.customer.name.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))}!</h2><p>Your demo order <strong>${order.id}</strong> is saved in this browser.<br>Total: <strong>₹${currency.format(order.total)}</strong> · ${order.payment}</p><p>No store has received this order and no payment was processed.</p><button class="checkout-submit" type="button" id="checkout-done">Back to shopping</button></div>`;
    overlay.querySelector('#checkout-done').addEventListener('click', closeCheckout);
  });
}

document.querySelectorAll('.add-button').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.product;
  const emojis = { 'Heirloom tomatoes': '🍅', 'Slow-fermented sourdough': '🥖', 'Wildflower raw honey': '🍯', 'Seasonal citrus box': '🍊' };
  const existing = cart.get(name);
  if (existing) existing.quantity += 1;
  else cart.set(name, { price: Number(button.dataset.price), quantity: 1, emoji: emojis[name] || '🛍️' });
  renderCart();
  showToast(`${name} added to your cart`);
}));
document.querySelector('.cart-button').addEventListener('click', openCart);
document.getElementById('drawer-close').addEventListener('click', closeCart);
document.getElementById('drawer-backdrop').addEventListener('click', closeCart);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (document.getElementById('checkout-overlay')) closeCheckout();
    else closeCart();
  }
});
document.getElementById('checkout-button').addEventListener('click', openCheckout);

document.querySelectorAll('.filter-pill').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('selected'));
  button.classList.add('selected');
  filterProducts();
}));
const searchInput = document.getElementById('product-search');
function filterProducts() {
  const category = document.querySelector('.filter-pill.selected').dataset.filter;
  const query = searchInput.value.trim().toLowerCase();
  document.querySelectorAll('.product-card').forEach(card => {
    const matchesCategory = category === 'all' || card.dataset.category === category;
    const matchesQuery = card.dataset.name.includes(query) || card.textContent.toLowerCase().includes(query);
    card.hidden = !(matchesCategory && matchesQuery);
  });
}
searchInput.addEventListener('input', filterProducts);
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    document.getElementById('shops').scrollIntoView({ behavior: 'smooth' });
  }
});
document.querySelectorAll('.favorite-button').forEach(button => button.addEventListener('click', () => {
  const liked = button.classList.toggle('liked');
  button.textContent = liked ? '♥' : '♡';
  showToast(liked ? 'Saved to your favorites' : 'Removed from your favorites');
}));
document.getElementById('menu-toggle').addEventListener('click', event => {
  const nav = document.querySelector('.main-nav');
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
  event.currentTarget.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelector('.main-nav').classList.remove('open');
  document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
}));
document.querySelector('.location-button').addEventListener('click', () => showToast('Location selection is coming soon.'));
document.querySelector('.icon-button').addEventListener('click', () => showToast('Your TrendCart account is coming soon.'));
document.getElementById('newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('newsletter-message').textContent = 'Thanks for joining the neighborhood. ♡';
  event.currentTarget.reset();
});
renderCart();
