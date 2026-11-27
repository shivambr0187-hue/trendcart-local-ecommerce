const $ = (selector, root = document) => root.querySelector(selector);
const loginView = $('#login-view'); const dashboard = $('#dashboard'); const message = $('#app-message');
const money = value => `₹${new Intl.NumberFormat('en-IN').format(value)}`;
async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function notify(text, isError = false) { message.textContent = text; message.style.color = isError ? '#a23a35' : '#386044'; }
function cell(row, text) { const td = document.createElement('td'); td.textContent = text; row.append(td); return td; }
function emptyRow(body, columns, text) { const row = document.createElement('tr'); const td = cell(row, text); td.colSpan = columns; td.className = 'empty'; body.append(row); }
function resetProductForm() { $('#product-form').reset(); $('[name="id"]', $('#product-form')).value = ''; $('#cancel-edit').hidden = true; }
async function loadProducts() {
  const { products } = await api('/api/admin/products'); const body = $('#products-body'); body.replaceChildren();
  if (!products.length) return emptyRow(body, 5, 'No products yet. Add one above to enable checkout for that item.');
  products.forEach(product => {
    const row = document.createElement('tr'); const nameCell = cell(row, product.name); const description = document.createElement('small'); description.textContent = product.description; description.className = 'muted'; nameCell.append(document.createElement('br'), description);
    cell(row, product.category); cell(row, money(product.price)); const activeCell = cell(row, product.active ? 'Visible' : 'Hidden');
    const actions = document.createElement('td'); const wrap = document.createElement('div'); wrap.className = 'row-actions';
    const edit = document.createElement('button'); edit.className = 'small-button'; edit.textContent = 'Edit'; edit.addEventListener('click', () => { const form = $('#product-form'); for (const key of ['id','name','category','description','price']) form.elements[key].value = key === 'id' ? product.id : product[key]; $('#cancel-edit').hidden = false; form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); wrap.append(edit);
    const toggle = document.createElement('button'); toggle.className = 'small-button'; toggle.textContent = product.active ? 'Hide' : 'Restore'; toggle.addEventListener('click', async () => { try { await api(`/api/admin/products/${product.id}`, { method: 'PUT', body: JSON.stringify({ ...product, active: !product.active }) }); await loadProducts(); notify('Product updated.'); } catch (error) { notify(error.message, true); } }); wrap.append(toggle); actions.append(wrap); row.append(actions); if (!product.active) activeCell.className = 'muted'; body.append(row);
  });
}
const statuses = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];
async function loadOrders() {
  const { orders } = await api('/api/admin/orders'); const body = $('#orders-body'); body.replaceChildren();
  if (!orders.length) return emptyRow(body, 6, 'No orders have been placed yet.');
  orders.forEach(order => {
    const row = document.createElement('tr'); const orderCell = cell(row, order.id); const date = document.createElement('small'); date.className = 'muted'; date.textContent = new Date(`${order.createdAt}Z`).toLocaleString(); orderCell.append(document.createElement('br'), date);
    cell(row, `${order.customer.name}\n${order.customer.phone}${order.customer.email ? ` · ${order.customer.email}` : ''}\n${order.customer.address}`);
    cell(row, order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')); cell(row, money(order.total));
    const selectCell = document.createElement('td'); const select = document.createElement('select'); select.className = 'status-select'; statuses.forEach(status => { const option = document.createElement('option'); option.value = status; option.textContent = status.replaceAll('_', ' '); option.selected = status === order.status; select.append(option); }); selectCell.append(select); row.append(selectCell);
    const updateCell = document.createElement('td'); const button = document.createElement('button'); button.className = 'small-button'; button.textContent = 'Update'; button.addEventListener('click', async () => { try { await api(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); notify(`Order ${order.id} updated.`); await loadOrders(); } catch (error) { notify(error.message, true); } }); updateCell.append(button); row.append(updateCell); body.append(row);
  });
}
async function showDashboard() { loginView.hidden = true; dashboard.hidden = false; $('#logout').hidden = false; await Promise.all([loadProducts(), loadOrders()]); }
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const out = $('#login-message'); out.textContent = ''; try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify(data) }); await showDashboard(); } catch (error) { out.textContent = error.message; } });
$('#product-form').addEventListener('submit', async event => { event.preventDefault(); const form = event.currentTarget; const product = Object.fromEntries(new FormData(form)); const id = product.id; delete product.id; product.price = Number(product.price); try { await api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(product) }); resetProductForm(); await loadProducts(); notify('Product saved.'); } catch (error) { notify(error.message, true); } });
$('#cancel-edit').addEventListener('click', resetProductForm);
$('#refresh').addEventListener('click', async () => { try { await Promise.all([loadProducts(), loadOrders()]); notify('Dashboard refreshed.'); } catch (error) { notify(error.message, true); } });
$('#logout').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST' }); location.reload(); } catch (error) { notify(error.message, true); } });
document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === button)); $('#products-section').hidden = button.dataset.tab !== 'products'; $('#orders-section').hidden = button.dataset.tab !== 'orders'; }));
api('/api/admin/me').then(showDashboard).catch(() => {});
