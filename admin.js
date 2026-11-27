const STORE_KEY='trendcart-orders';
const PRODUCTS_KEY='trendcart-admin-products';
const SETTINGS_KEY='trendcart-admin-settings';

const defaultProducts=[
 {id:'P-001',name:'Heirloom tomatoes',category:'produce',price:120,stock:48,status:'Active',emoji:'🍅'},
 {id:'P-002',name:'Slow-fermented sourdough',category:'bakery',price:280,stock:24,status:'Active',emoji:'🥖'},
 {id:'P-003',name:'Wildflower raw honey',category:'pantry',price:340,stock:18,status:'Active',emoji:'🍯'},
 {id:'P-004',name:'Seasonal citrus box',category:'produce',price:220,stock:32,status:'Active',emoji:'🍊'}
];

function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function getOrders(){return readJson(STORE_KEY,[]);}
function getProducts(){return readJson(PRODUCTS_KEY,defaultProducts);}
function currency(value){return `₹${Number(value||0).toLocaleString('en-IN')}`;}
function initials(name){return String(name||'Guest').split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();}
function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function escapeHtml(value){const div=document.createElement('div');div.textContent=String(value??'');return div.innerHTML;}

let toastTimer;
function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}

function navigate(view){
 document.querySelectorAll('.view').forEach(section=>section.classList.remove('active'));
 document.getElementById(`${view}View`)?.classList.add('active');
 document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
 document.getElementById('sidebar').classList.remove('open');
 if(view==='dashboard')renderDashboard();
 if(view==='orders')renderOrders();
 if(view==='products')renderProducts();
 if(view==='customers')renderCustomers();
}

document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.viewLink)));
document.getElementById('menuButton').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));

const profileButton=document.getElementById('profileButton');
const profileMenu=document.getElementById('profileMenu');
profileButton.addEventListener('click',()=>profileMenu.classList.toggle('open'));
document.addEventListener('click',event=>{if(!event.target.closest('.topbar-actions'))profileMenu.classList.remove('open');});
profileMenu.querySelectorAll('[data-profile-action]').forEach(button=>button.addEventListener('click',()=>{profileMenu.classList.remove('open');if(button.dataset.profileAction==='profile')navigate('settings');else showToast(button.dataset.profileAction==='logout'?'Demo logout completed':'Security settings are demo-only');}));

function normalizeOrders(){
 const orders=getOrders();
 return orders.map((order,index)=>({...order,status:order.status||(['Pending','Processing','Delivered'][index%3])}));
}

function renderDashboard(){
 const orders=normalizeOrders(),products=getProducts();
 const revenue=orders.reduce((sum,order)=>sum+Number(order.total||0),0);
 const customers=new Set(orders.map(order=>order.customer?.phone||order.customer?.email||order.customer?.name)).size;
 document.getElementById('revenueMetric').textContent=currency(revenue);
 document.getElementById('ordersMetric').textContent=orders.length;
 document.getElementById('customersMetric').textContent=customers;
 document.getElementById('productsMetric').textContent=products.length;
 document.getElementById('orderBadge').textContent=orders.length;
 renderRecentOrders(orders);
 renderSalesChart(orders);
 renderStatusChart(orders);
}

function renderRecentOrders(orders){
 const tbody=document.getElementById('recentOrders');
 tbody.innerHTML=(orders.length?orders.slice(0,5):[]).map(order=>`<tr><td><strong>${escapeHtml(order.id)}</strong></td><td><div class="customer-cell"><span class="mini-avatar">${initials(order.customer?.name)}</span>${escapeHtml(order.customer?.name||'Guest')}</div></td><td>${formatDate(order.date)}</td><td><strong>${currency(order.total)}</strong></td><td>${escapeHtml(order.payment||'Cash on delivery')}</td><td><span class="status-badge ${String(order.status).toLowerCase()}">${escapeHtml(order.status)}</span></td><td><button class="action-button" data-order-id="${escapeHtml(order.id)}">View</button></td></tr>`).join('')||'<tr><td colspan="7">No demo orders yet. Place an order in the storefront.</td></tr>';
 tbody.querySelectorAll('[data-order-id]').forEach(button=>button.addEventListener('click',()=>navigate('orders')));
}

function renderSalesChart(orders){
 const chart=document.getElementById('salesChart');
 const values=[0,0,0,0,0,0,0];
 orders.forEach(order=>{const index=new Date(order.date).getDay();values[index%7]+=Number(order.total||0);});
 const max=Math.max(...values,1);
 const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 chart.innerHTML=values.map((value,index)=>`<div class="chart-column"><div class="chart-bar" style="height:${Math.max(5,value/max*100)}%" title="${currency(value)}"></div><span>${labels[index]}</span></div>`).join('');
}

function renderStatusChart(orders){
 const counts={Pending:0,Processing:0,Delivered:0};
 orders.forEach(order=>{const status=counts[order.status]!=null?order.status:'Pending';counts[status]++;});
 const total=orders.length;
 document.getElementById('statusTotal').textContent=total;
 document.getElementById('statusList').innerHTML=[['Pending','#dce1e8',counts.Pending],['Processing','#f2a13b',counts.Processing],['Delivered','#63866b',counts.Delivered]].map(([label,color,count])=>`<div class="status-row"><span class="status-dot" style="background:${color}"></span><span>${label}</span><strong>${count}</strong></div>`).join('');
 const p=total?counts.Pending/total*100:0,pr=total?counts.Processing/total*100:0,d=total?counts.Delivered/total*100:0;
 document.getElementById('statusDonut').style.background=`conic-gradient(#63866b 0 ${d}%,#f2a13b ${d}% ${d+pr}%,#6687bd ${d+pr}% ${d+pr+p}%,#dce1e8 ${d+pr+p}% 100%)`;
}

let orderFilter='all';
function renderOrders(search=''){
 const tbody=document.getElementById('ordersTable');
 let orders=normalizeOrders();
 if(orderFilter!='all')orders=orders.filter(order=>order.status===orderFilter);
 const query=search.toLowerCase();
 if(query)orders=orders.filter(order=>[order.id,order.customer?.name,order.customer?.phone,order.payment].join(' ').toLower().includes(query));
 tbody.innerHTML=orders.map(order=>`<tr><td><strong>${escapeHtml(order.id)}</strong></td><td><div class="customer-cell"><span class="mini-avatar">${initials(order.customer?.name)}</span><span><strong>${escapeHtml(order.customer?.name||'Guest')}</strong><small>${escapeHtml(order.customer?.phone||'')}</small></span></div></td><td>${(order.items||[]).reduce((sum,item)=>sum+Number(item.quantity||0),0)}</td><td>${formatDate(order.date)}</td><td><strong>${currency(order.total)}</strong></td><td><select class="status-select" data-order-id="${escapeHtml(order.id)}" aria-label="Change order status"><option${order.status==='Pending'?' selected':''}>Pending</option><option${order.status==='Processing'?' selected':''}>Processing</option><option${order.status==='Delivered'?' selected':''}>Delivered</option></select></td><td><button class="action-button" data-details="${escapeHtml(order.id)}">Details</button></td></tr>`).join('')||'<tr><td colspan="7">No matching orders found.</td></tr>';
 tbody.querySelectorAll('.status-select').forEach(select=>select.addEventListener('change',()=>updateOrderStatus(select.dataset.orderId,select.value)));
}

function updateOrderStatus(id,status){
 const orders=getOrders();
 const order=orders.find(item=>item.id===id);
 if(order){order.status=status;writeJson(STORE_KEY,orders);showToast(`Order ${id} marked ${status}`);renderOrders(document.getElementById('orderSearch').value);renderDashboard();}
}

document.querySelectorAll('[data-order-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-order-filter]').forEach(item=>item.classList.remove('active'));button.classList.add('active');orderFilter=button.dataset.orderFilter;renderOrders(document.getElementById('orderSearch').value);}));
document.getElementById('orderSearch').addEventListener('input',event=>renderOrders(event.target.value));

let productFilter='all';
function renderProducts(search=''){
 let products=getProducts();
 if(productFilter!='all')products=products.filter(product=>product.category===productFilter);
 const query=search.toLowerCase();
 if(query)products=products.filter(product=>product.name.toLowerCase().includes(query));
 document.getElementById('productsTable').innerHTML=products.map(product=>`<tr><td><div class="customer-cell"><span class="mini-avatar">${escapeHtml(product.emoji||'◇')}</span><strong>${escapeHtml(product.name)}</strong></div></td><td>${escapeHtml(product.category)}</td><td><strong>${currency(product.price)}</strong></td><td>${Number(product.stock)}</td><td><span class="status-badge ${String(product.status).toLowerCase()}">${escapeHtml(product.status)}</span></td><td><button class="action-button" data-edit="${escapeHtml(product.id)}">Edit</button> <button class="action-button" data-delete="${escapeHtml(product.id)}">Delete</button></td></tr>`).join('')||'<tr><td colspan="6">No products found.</td></tr>';
 document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>openProductModal(button.dataset.edit)));
 document.querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>deleteProduct(button.dataset.delete)));
}

document.querySelectorAll('[data-product-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-product-filter]').forEach(item=>item.classList.remove('active'));button.classList.add('active');productFilter=button.dataset.productFilter;renderProducts();}));

const modalBackdrop=document.getElementById('modalBackdrop');
const productForm=document.getElementById('productForm');
function openProductModal(id){const product=id?getProducts().find(item=>item.id===id):null;document.getElementById('modalTitle').textContent=product?'Edit product':'Add product';productForm.elements.id.value=product?.id||'';productForm.elements.name.value=product?.name||'';productForm.elements.category.value=product?.category||'produce';productForm.elements.price.value=product?.price||'';productForm.elements.stock.value=product?.stock||0;productForm.elements.status.value=product?.status||'Active';modalBackdrop.hidden=false;productForm.elements.name.focus();}
function closeProductModal(){modalBackdrop.hidden=true;}
document.getElementById('addProduct').addEventListener('click',()=>openProductModal());
document.getElementById('modalClose').addEventListener('click',closeProductModal);document.getElementById('modalCancel').addEventListener('click',closeProductModal);modalBackdrop.addEventListener('click',event=>{if(event.target===modalBackdrop)closeProductModal();});
productForm.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(productForm);const products=getProducts();const id=data.get('id')||`P-${Date.now()}`;const existing=products.find(product=>product.id===id);const product={id,name:String(data.get('name')).trim(),category:String(data.get('category')),price:Number(data.get('price')),stock:Number(data.get('stock')),status:String(data.get('status')),emoji:existing?.emoji||'◇'};if(existing)Object.assign(existing,product);else products.push(product);writeJson(PRODUCTS_KEY,products);closeProductModal();renderProducts();renderDashboard();showToast(existing?'Product updated':'Product added');});
function deleteProduct(id){if(!confirm('Delete this product from demo inventory?'))return;const products=getProducts().filter(product=>product.id!==id);writeJson(PRODUCTS_KEY,products);renderProducts();renderDashboard();showToast('Product deleted');}

function renderCustomers(search=''){
 const orders=normalizeOrders();
 const customers=new Map();
 orders.forEach(order=>{const customer=order.customer||{};const key=customer.phone||customer.email||customer.name||'Guest';if(!customers.has(key))customers.set(key,{name:customer.name||'Guest',phone:customer.phone||'—',email:customer.email||'—',orders:0,spent:0});const item=customers.get(key);item.orders++;item.spent+=Number(order.total||0);});
 let rows=[...customers.values()].filter(customer=>[customer.name,customer.phone,customer.email].join(' ').toLowerCase().includes(search.toLowerCase()));
 document.getElementById('customersTable').innerHTML=rows.map(customer=>`<tr><td><div class="customer-cell"><span class="mini-avatar">${initials(customer.name)}</span><strong>${escapeHtml(customer.name)}</strong></div></td><td>${escapeHtml(customer.phone)}</td><td>${escapeHtml(customer.email)}</td><td>${customer.orders}</td><td><strong>${currency(customer.spent)}</strong></td><td><span class="status-badge active">Active</span></td></tr>`).join('')||'<tr><td colspan="6">No customers found. Demo checkout customers appear here.</td></tr>';
}
document.getElementById('customerSearch').addEventListener('input',event=>renderCustomers(event.target.value));

document.getElementById('profileForm').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.currentTarget);localStorage.setItem('trendcart-admin-profile',JSON.stringify({name:data.get('name'),email:data.get('email')}));showToast('Admin profile saved');});
document.getElementById('storeForm').addEventListener('submit',event=>{event.preventEvent;});
// Keep settings save handler separate to avoid browser-only validation issues.
document.getElementById('storeForm').addEventListener('submit',event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;const data=new FormData(event.currentTarget);writeJson(SETTINGS_KEY,{storeName:data.get('storeName'),threshold:Number(data.get('threshold')),delivery:Number(data.get('delivery'))});showToast('Store settings saved');});

document.getElementById('exportOrders').addEventListener('click',()=>{const orders=normalizeOrders();const header=['Order','Customer','Phone','Date','Total','Payment','Status'];const rows=orders.map(order=>[order.id,order.customer?.name,order.customer?.phone,order.date,order.total,order.payment,order.status]);const csv=[header,...rows].map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const link=document.createElement('a');link.href=url;link.download='trendcart-orders.csv';link.click();URL.revokeObjectURL(url);showToast('Order report exported');});

document.getElementById('notificationButton').addEventListener('click',()=>showToast('You have no new notifications'));
document.getElementById('globalSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){navigate('orders');document.getElementById('orderSearch').value=event.currentTarget.value;renderOrders(event.currentTarget.value);}});

const savedProfile=readJson('trendcart-admin-profile',{name:'Shivam',email:'admin@trendcart.local'});const profileName=document.querySelector('#profileForm input[name="name"]');const profileEmail=document.querySelector('#profileForm input[name="email"]');if(profileName)profileName.value=savedProfile.name;if(profileEmail)profileEmail.value=savedProfile.email;const savedSettings=readJson(SETTINGS_KEY,null);if(savedSettings){document.querySelector('#storeForm input[name="storeName"]').value=savedSettings.storeName;document.querySelector('#storeForm input[name="threshold"]').value=savedSettings.threshold;document.querySelector('#storeForm input[name="delivery"]').value=savedSettings.delivery;}

renderDashboard();renderOrders();renderProducts();renderCustomers();
