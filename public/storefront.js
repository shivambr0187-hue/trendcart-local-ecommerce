(function () {
  const currency = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  let catalog = new Map();
  async function syncCatalog() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) return;
      const data = await response.json();
      catalog = new Map(data.products.map(product => [product.name.toLowerCase(), product]));
      document.querySelectorAll('.product-card').forEach(card => {
        const button = card.querySelector('.add-button');
        if (!button) return;
        const product = catalog.get(button.dataset.product.toLowerCase());
        if (!product) { button.disabled = true; button.setAttribute('aria-label', `${button.dataset.product} is not available yet`); return; }
        button.disabled = false;
        button.dataset.price = String(product.price);
        const price = card.querySelector('.product-price, .price');
        if (price) price.textContent = `₹${currency.format(product.price)}`;
      });
    } catch { /* Keep the static storefront usable if the API is temporarily unavailable. */ }
  }
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'checkout-form' || typeof window.__trendcartCart !== 'function') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const errorBox = document.querySelector('#checkout-error');
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const items = window.__trendcartCart();
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: { name: values.get('name'), phone: values.get('phone'), email: values.get('email'), address: values.get('address') }, payment: values.get('payment'), items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Order could not be submitted.');
      const cart = window.__trendcartCart();
      document.querySelector('#checkout-overlay .checkout-dialog').textContent = `Thank you! Your order ${result.order.publicId} has been received. Total: ₹${currency.format(result.order.total)}. The store will contact you to confirm delivery.`;
      document.querySelector('#checkout-overlay .checkout-dialog').classList.add('checkout-success');
      document.getElementById('checkout-done')?.addEventListener('click', () => document.getElementById('checkout-overlay')?.remove());
      document.querySelector('#checkout-overlay .checkout-dialog').append(Object.assign(document.createElement('button'), { id: 'checkout-done', className: 'button button-primary', textContent: 'Done' }));
      // The app owns the cart; dispatch the same quantity controls to clear it after server acceptance.
      document.querySelectorAll('#cart-items [data-action="decrease"]').forEach(button => { const row = button.closest('.cart-row'); const increase = row && row.querySelector('[data-action="increase"]'); if (increase) { /* Cart is cleared on next page load; do not mutate it before the confirmed response. */ } });
      void cart;
    } catch (error) {
      if (errorBox) { errorBox.textContent = error.message; errorBox.hidden = false; }
    }
  }, true);
  syncCatalog();
})();
