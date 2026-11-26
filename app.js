const cart = new Map();
const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const countEl = document.getElementById('cart-count');
const drawerCount = document.getElementById('drawer-count');
const cartItems = document.getElementById('cart-items');
const cartSummary = document.getElementById('cart-summary');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function itemCount() {
  return [...cart.values()].reduce((total, item) => total + item.quantity, 0);
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
  cartItems.innerHTML = [...cart.entries()].map(([name, item]) => `<div class="cart-row"><div class="cart-row-thumb" aria-hidden="true">${item.emoji}</div><div class="cart-row-info"><strong>${name}</strong><small>${currency.format(item.price)} each</small></div><div class="cart-row-controls"><button type="button" data-action="decrease" data-name="${name}" aria-label="Remove one ${name}">−</button><span>${item.quantity}</span><button type="button" data-action="increase" data-name="${name}" aria-label="Add one ${name}">+</button></div></div>`).join('');
  const subtotal = [...cart.values()].reduce((total, item) => total + item.price * item.quantity, 0);
  document.getElementById('cart-subtotal').textContent = `₹${currency.format(subtotal)}`;
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
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCart(); });
document.getElementById('checkout-button').addEventListener('click', () => showToast('Checkout is a demo — your local finds are saved here.'));

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
