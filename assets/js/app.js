/* ==========================================================================
   ZON CORPORATION RWANDA — MASTER APP (SPA Edition)
   ========================================================================== */

// ===== Supabase Connection =====
const SUPABASE_URL = 'https://vnmvpgigriqwgjibddal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXZwZ2lncmlxd2dqaWJkZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzY0MDAsImV4cCI6MjEwNjk1MjQwMH0.GBsPmxSuyXpUmTDhl_BqYj1bR79j7-XYHTPMm88pH-M';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Global State =====
let zonCart = JSON.parse(localStorage.getItem('zonCart')) || [];
let allProducts = [];
let activeCategories = [];
let searchTerm = '';
let inStockOnly = false;
let sortBy = 'newest';
let currentProduct = null;

// ===== Helpers =====
function formatRWF(amount) {
    return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(amount);
}

function showToast(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `zon-toast toast-${type}`;
    toast.innerHTML = `
        <div class="zon-toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="zon-toast-content">
            <p class="zon-toast-title">${title}</p>
            <p class="zon-toast-msg">${message}</p>
        </div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

function runPageLoader() {
    let loader = document.getElementById('page-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = '<div class="loader-bar"></div>';
        document.body.appendChild(loader);
    }
    const bar = loader.querySelector('.loader-bar');
    bar.style.opacity = '1';
    bar.style.width = '0%';
    setTimeout(() => bar.style.width = '30%', 50);
    setTimeout(() => bar.style.width = '70%', 200);
    setTimeout(() => bar.style.width = '100%', 400);
    setTimeout(() => { bar.style.opacity = '0'; }, 700);
}

// ===== Supabase Fetchers =====
async function fetchProducts() {
    try {
        const { data, error } = await db
            .from('products')
            .select(`*, categories (name)`)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (e) {
        console.error(e);
        showToast('Connection Error', 'Could not load products.', 'error');
        return [];
    }
}

async function fetchProductById(id) {
    try {
        const { data, error } = await db
            .from('products')
            .select(`*, categories (name), product_images (image_url, sort_order)`)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    } catch (e) { return null; }
}

async function submitOrder(orderData, items) {
    try {
        const date = new Date();
        const orderNumber = `ZON-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: order, error: oErr } = await db.from('orders').insert([{
            order_number: orderNumber,
            customer_name: orderData.name,
            customer_phone: orderData.phone,
            customer_email: orderData.email,
            delivery_address: orderData.address,
            delivery_zone: orderData.zone,
            delivery_fee: orderData.deliveryFee,
            total_amount: orderData.total,
            payment_method: orderData.paymentMethod,
            status: 'pending'
        }]).select().single();
        if (oErr) throw oErr;

        const orderItems = items.map(i => ({
            order_id: order.id,
            product_id: i.id,
            quantity: i.quantity,
            price: i.price
        }));
        const { error: iErr } = await db.from('order_items').insert(orderItems);
        if (iErr) throw iErr;

        zonCart = [];
        localStorage.removeItem('zonCart');
        updateCartCount();
        return { success: true, orderNumber };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ===== Cart =====
function addToCart(product, quantity = 1) {
    const existing = zonCart.find(i => i.id === product.id);
    if (existing) existing.quantity += quantity;
    else zonCart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url || 'https://placehold.co/100x100/1A1A1A/E85D04?text=ZON',
        quantity
    });
    localStorage.setItem('zonCart', JSON.stringify(zonCart));
    updateCartCount(true);
    showToast('Added to Cart', `${product.name} × ${quantity}`, 'success');
}

function removeFromCart(id) {
    const item = zonCart.find(i => i.id === id);
    zonCart = zonCart.filter(i => i.id !== id);
    localStorage.setItem('zonCart', JSON.stringify(zonCart));
    updateCartCount();
    if (item) showToast('Removed', item.name, 'info');
}

function getCartTotal() {
    return zonCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
}

function updateCartCount(bump = false) {
    const els = document.querySelectorAll('.cart-count');
    const count = zonCart.reduce((sum, i) => sum + i.quantity, 0);
    els.forEach(el => {
        el.textContent = count;
        if (bump) {
            el.classList.remove('bump');
            void el.offsetWidth;
            el.classList.add('bump');
        }
    });
}

// ===== Router =====
function navigate(page, param = null) {
    runPageLoader();

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Update URL
    const url = param ? `#${page}/${param}` : `#${page}`;
    window.history.pushState({ page, param }, '', url);

    // Show target page
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update nav active state
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.classList.toggle('active', el.dataset.nav === page);
    });

    // Close mobile menu
    document.getElementById('mobile-menu')?.classList.remove('open');

    // Page-specific renders
    if (page === 'home') renderHome();
    else if (page === 'shop') renderShop();
    else if (page === 'product' && param) renderProductDetail(param);
    else if (page === 'cart') renderCart();
    else if (page === 'checkout') renderCheckout();
}

// ===== Home Page Render =====
async function renderHome() {
    if (allProducts.length === 0) allProducts = await fetchProducts();

    // Update stats
    document.getElementById('stat-products').textContent = allProducts.length + '+';
    document.getElementById('stat-products-2').textContent = allProducts.length + '+';

    // Hero image = most expensive product
    if (allProducts.length > 0) {
        const hero = [...allProducts].sort((a,b) => b.price - a.price)[0];
        const img = document.getElementById('hero-product-img');
        if (hero.image_url) { img.src = hero.image_url; img.alt = hero.name; }
    }

    // Featured product grid (top 8)
    renderProductGrid(allProducts.slice(0, 8), 'home-product-grid');
}

// ===== Shop Page Render =====
async function renderShop() {
    if (allProducts.length === 0) allProducts = await fetchProducts();
    renderCategoryFilters();
    applyShopFilters();
}

function renderCategoryFilters() {
    const container = document.getElementById('shop-category-filters');
    if (!container) return;
    const cats = [...new Set(allProducts.map(p => p.categories?.name).filter(Boolean))];
    container.innerHTML = cats.map(cat => {
        const slug = cat.toLowerCase().replace(/\s+/g, '-');
        const checked = activeCategories.includes(slug) ? 'checked' : '';
        return `
            <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" class="cat-checkbox checkbox checkbox-sm" value="${slug}" ${checked} style="accent-color:var(--zon-primary);">
                <span class="text-sm">${cat}</span>
            </label>`;
    }).join('');

    document.querySelectorAll('.cat-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            activeCategories = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(c => c.value);
            applyShopFilters();
        });
    });
}

function applyShopFilters() {
    let filtered = [...allProducts];
    if (activeCategories.length > 0) {
        filtered = filtered.filter(p => {
            const slug = p.categories?.name?.toLowerCase().replace(/\s+/g, '-');
            return activeCategories.includes(slug);
        });
    }
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (inStockOnly) filtered = filtered.filter(p => p.stock_quantity > 0);

    if (sortBy === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    if (sortBy === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    if (sortBy === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));

    document.getElementById('shop-result-count').textContent = `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;

    const grid = document.getElementById('shop-product-grid');
    const noRes = document.getElementById('shop-no-results');

    if (filtered.length === 0) {
        grid.innerHTML = '';
        noRes.classList.remove('hidden');
    } else {
        noRes.classList.add('hidden');
        renderProductGrid(filtered, 'shop-product-grid');
    }
}

// ===== Product Detail =====
async function renderProductDetail(id) {
    const container = document.getElementById('product-detail-content');
    container.innerHTML = `
        <div class="grid md:grid-cols-2 gap-12">
            <div class="skeleton aspect-square rounded-3xl"></div>
            <div>
                <div class="skeleton h-6 w-32 mb-4"></div>
                <div class="skeleton h-12 w-full mb-4"></div>
                <div class="skeleton h-8 w-40 mb-8"></div>
                <div class="skeleton h-24 w-full mb-8"></div>
                <div class="skeleton h-14 w-full"></div>
            </div>
        </div>`;

    const product = await fetchProductById(id);
    if (!product) {
        container.innerHTML = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">😕</div>
                <h2 class="text-2xl font-bold mb-2">Product Not Found</h2>
                <button class="btn-zon-primary mt-4" onclick="navigate('shop')">Back to Shop</button>
            </div>`;
        return;
    }

    currentProduct = product;

    let badgeClass = 'badge-in-stock', badgeText = 'In Stock';
    if (product.stock_quantity <= 0) { badgeClass = 'badge-out-stock'; badgeText = 'Out of Stock'; }
    else if (product.stock_quantity <= product.reorder_level) { badgeClass = 'badge-low-stock'; badgeText = 'Low Stock'; }

    const image = product.image_url || 'https://placehold.co/800x800/1A1A1A/E85D04?text=ZON';
    const isOut = product.stock_quantity <= 0;

    container.innerHTML = `
        <div class="grid md:grid-cols-2 gap-10 lg:gap-16">
            <div>
                <div class="bg-white rounded-3xl overflow-hidden shadow-[var(--shadow-soft)] relative aspect-square">
                    <img src="${image}" alt="${product.name}" class="w-full h-full object-cover">
                    <span class="badge-stock ${badgeClass} absolute top-4 left-4">${badgeText}</span>
                </div>
            </div>
            <div>
                <p class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--zon-accent)] mb-3">${product.categories?.name || 'General'}</p>
                <h1 class="text-3xl md:text-4xl font-bold mb-4 leading-tight">${product.name}</h1>
                <div class="flex items-baseline gap-3 mb-6">
                    <span class="text-4xl font-bold text-[var(--zon-primary)]">${formatRWF(product.price)}</span>
                    <span class="text-sm text-gray-500">VAT included</span>
                </div>
                <div class="mb-8">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Description</h3>
                    <p class="text-gray-700 leading-relaxed">${product.description || 'High quality product from Zon Corporation Rwanda.'}</p>
                </div>
                ${!isOut ? `
                    <div class="flex flex-col sm:flex-row gap-4 mb-8">
                        <div class="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                            <button onclick="changeQty(-1)" class="px-5 py-4 text-xl font-bold text-gray-600 hover:bg-gray-100 transition">−</button>
                            <input type="number" id="qty-input" value="1" min="1" max="${product.stock_quantity}" class="w-16 py-4 text-center font-bold text-lg border-none focus:outline-none">
                            <button onclick="changeQty(1)" class="px-5 py-4 text-xl font-bold text-gray-600 hover:bg-gray-100 transition">+</button>
                        </div>
                        <button onclick="addCurrentToCart()" class="btn-zon-primary flex-1 py-4 text-base">Add to Cart</button>
                    </div>
                ` : `
                    <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-center font-semibold">
                        Currently Out of Stock
                    </div>
                `}
                <div class="grid grid-cols-3 gap-3 pt-6 border-t border-gray-200">
                    <div class="text-center">
                        <div class="text-2xl mb-1">🚚</div>
                        <p class="text-xs font-semibold">Fast Delivery</p>
                        <p class="text-[10px] text-gray-500">Kigali same-day</p>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl mb-1">🛡️</div>
                        <p class="text-xs font-semibold">Warranty</p>
                        <p class="text-[10px] text-gray-500">1-2 Year</p>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl mb-1">💬</div>
                        <p class="text-xs font-semibold">Support</p>
                        <p class="text-[10px] text-gray-500">WhatsApp us</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-16">
            <div class="border-b border-gray-200 flex">
                <button class="tab-btn active">Specifications</button>
                <button class="tab-btn">Reviews</button>
                <button class="tab-btn">Shipping</button>
            </div>
            <div class="py-8">
                <table class="w-full max-w-2xl">
                    <tbody>
                        <tr class="border-b border-gray-100"><td class="py-3 pr-6 text-sm font-semibold text-gray-500 w-1/3">SKU</td><td class="py-3 text-sm">${product.sku || 'N/A'}</td></tr>
                        <tr class="border-b border-gray-100"><td class="py-3 pr-6 text-sm font-semibold text-gray-500">Category</td><td class="py-3 text-sm">${product.categories?.name || 'General'}</td></tr>
                        <tr class="border-b border-gray-100"><td class="py-3 pr-6 text-sm font-semibold text-gray-500">Stock</td><td class="py-3 text-sm">${product.stock_quantity} units</td></tr>
                        <tr class="border-b border-gray-100"><td class="py-3 pr-6 text-sm font-semibold text-gray-500">Warranty</td><td class="py-3 text-sm">1-2 Years</td></tr>
                        <tr class="border-b border-gray-100"><td class="py-3 pr-6 text-sm font-semibold text-gray-500">Delivery</td><td class="py-3 text-sm">Available across Rwanda</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function changeQty(delta) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    if (currentProduct && val > currentProduct.stock_quantity) {
        val = currentProduct.stock_quantity;
        showToast('Stock Limit', `Only ${currentProduct.stock_quantity} available`, 'info');
    }
    input.value = val;
}

function addCurrentToCart() {
    const qty = parseInt(document.getElementById('qty-input').value);
    addToCart(currentProduct, qty);
}

// ===== Cart Page =====
function renderCart() {
    const empty = document.getElementById('cart-empty');
    const content = document.getElementById('cart-content');

    if (zonCart.length === 0) {
        empty.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    empty.classList.add('hidden');
    content.classList.remove('hidden');

    document.getElementById('cart-items-list').innerHTML = zonCart.map(item => `
        <div class="p-6 border-b border-gray-100 flex items-center gap-4">
            <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl bg-gray-100">
            <div class="flex-1">
                <h3 class="font-bold text-sm leading-tight mb-1">${item.name}</h3>
                <p class="text-[var(--zon-primary)] font-bold text-sm">${formatRWF(item.price)}</p>
            </div>
            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button onclick="updateCartQty('${item.id}', -1)" class="px-3 py-2 text-gray-600 hover:bg-gray-100">−</button>
                <span class="px-4 py-2 font-bold text-sm">${item.quantity}</span>
                <button onclick="updateCartQty('${item.id}', 1)" class="px-3 py-2 text-gray-600 hover:bg-gray-100">+</button>
            </div>
            <button onclick="removeFromCart('${item.id}'); renderCart();" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    `).join('');

    const subtotal = getCartTotal();
    document.getElementById('cart-subtotal').textContent = formatRWF(subtotal);
    document.getElementById('cart-total').textContent = formatRWF(subtotal);
}

function updateCartQty(id, delta) {
    const item = zonCart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity < 1) item.quantity = 1;
    localStorage.setItem('zonCart', JSON.stringify(zonCart));
    updateCartCount();
    renderCart();
}

function clearCart() {
    if (!confirm('Remove all items from your cart?')) return;
    zonCart = [];
    localStorage.removeItem('zonCart');
    updateCartCount();
    renderCart();
}

// ===== Checkout =====
const DELIVERY_FEES = { kigali: 2000, outside: 5000 };
const FREE_DELIVERY = 50000;
let currentZone = 'kigali';

function renderCheckout() {
    if (zonCart.length === 0) {
        document.getElementById('checkout-empty').classList.remove('hidden');
        document.getElementById('checkout-content').classList.add('hidden');
        return;
    }
    document.getElementById('checkout-empty').classList.add('hidden');
    document.getElementById('checkout-content').classList.remove('hidden');

    document.getElementById('checkout-items').innerHTML = zonCart.map(item => `
        <div class="flex items-center gap-3">
            <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded-lg bg-gray-100">
            <div class="flex-1">
                <p class="font-semibold text-sm leading-tight">${item.name}</p>
                <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
            </div>
            <span class="font-bold text-sm">${formatRWF(item.price * item.quantity)}</span>
        </div>
    `).join('');

    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const subtotal = getCartTotal();
    const fee = subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEES[currentZone];
    const total = subtotal + fee;
    document.getElementById('checkout-subtotal').textContent = formatRWF(subtotal);
    document.getElementById('checkout-delivery').textContent = fee === 0 ? 'FREE' : formatRWF(fee);
    document.getElementById('checkout-total').textContent = formatRWF(total);
}

// ===== Product Grid Renderer =====
function renderProductGrid(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (products.length === 0) {
        container.innerHTML = `<p class="text-gray-500 col-span-full text-center py-10">No products found.</p>`;
        return;
    }
    container.innerHTML = products.map(product => {
        let badgeClass = 'badge-in-stock', badgeText = 'In Stock';
        if (product.stock_quantity <= 0) { badgeClass = 'badge-out-stock'; badgeText = 'Out of Stock'; }
        else if (product.stock_quantity <= product.reorder_level) { badgeClass = 'badge-low-stock'; badgeText = 'Low Stock'; }
        const img = product.image_url || 'https://placehold.co/400x400/1A1A1A/E85D04?text=ZON';
        const isOut = product.stock_quantity <= 0;
        return `
            <div class="product-card">
                <div class="product-image-wrapper">
                    <div onclick="navigate('product','${product.id}')" class="cursor-pointer w-full h-full">
                        <img src="${img}" alt="${product.name}">
                    </div>
                    <span class="badge-stock ${badgeClass} absolute top-3 left-3">${badgeText}</span>
                    ${!isOut ? `<button onclick='event.stopPropagation(); addToCart(${JSON.stringify(product).replace(/'/g, "&apos;")})' class="quick-add">+ Quick Add</button>` : ''}
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <p class="text-xs font-semibold text-[var(--zon-accent)] mb-1 uppercase tracking-wide">${product.categories?.name || 'General'}</p>
                    <h4 class="font-bold text-base leading-tight mb-2 cursor-pointer hover:text-[var(--zon-primary)]" onclick="navigate('product','${product.id}')">${product.name}</h4>
                    <div class="mt-auto pt-3 flex justify-between items-center">
                        <span class="font-bold text-lg text-[var(--zon-primary)]">${formatRWF(product.price)}</span>
                        <button onclick="navigate('product','${product.id}')" class="text-xs font-semibold text-gray-500 hover:text-[var(--zon-primary)]">View →</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', async () => {
    runPageLoader();
    updateCartCount();

    // Handle initial URL hash
    const hash = window.location.hash.replace('#', '') || 'home';
    const [page, param] = hash.split('/');
    navigate(page, param);

    // Handle back/forward buttons
    window.addEventListener('popstate', (e) => {
        const state = e.state;
        if (state) navigate(state.page, state.param);
    });
});

// Expose functions globally
window.navigate = navigate;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQty = updateCartQty;
window.clearCart = clearCart;
window.changeQty = changeQty;
window.addCurrentToCart = addCurrentToCart;
window.updateCheckoutSummary = updateCheckoutSummary;