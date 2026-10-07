/* ==========================================================================
   ZON CORPORATION RWANDA - SUPABASE API CONNECTION (api.js)
   ========================================================================== */

const SUPABASE_URL = 'https://vnmvpgigriqwgjibddal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZubXZwZ2lncmlxd2dqaWJkZGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzY0MDAsImV4cCI6MjEwNjk1MjQwMH0.GBsPmxSuyXpUmTDhl_BqYj1bR79j7-XYHTPMm88pH-M';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let zonCart = JSON.parse(localStorage.getItem('zonCart')) || [];

function formatRWF(amount) {
    return new Intl.NumberFormat('en-RW', { 
        style: 'currency', currency: 'RWF', minimumFractionDigits: 0 
    }).format(amount);
}

/* ============================================================
   POLISH — Toast Notification System
   ============================================================ */
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
        </div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

/* ============================================================
   POLISH — Page Loader Bar
   ============================================================ */
function initPageLoader() {
    if (document.getElementById('page-loader')) return;
    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.innerHTML = '<div class="loader-bar"></div>';
    document.body.appendChild(loader);

    const bar = loader.querySelector('.loader-bar');
    setTimeout(() => bar.style.width = '30%', 100);
    setTimeout(() => bar.style.width = '70%', 300);
    setTimeout(() => bar.style.width = '100%', 600);
    setTimeout(() => { bar.style.opacity = '0'; }, 900);
    setTimeout(() => loader.remove(), 1200);
}

/* ============================================================
   Fetch Functions
   ============================================================ */
async function fetchProducts() {
    try {
        const { data, error } = await db
            .from('products')
            .select(`*, categories (name)`)
            .eq('status', 'active')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching products:', error.message);
        showToast('Connection Error', 'Could not load products. Check your internet.', 'error');
        return [];
    }
}

async function fetchProductById(productId) {
    try {
        const { data, error } = await db
            .from('products')
            .select(`*, categories (name), product_images (image_url, sort_order)`)
            .eq('id', productId)
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching product:', error.message);
        return null;
    }
}

async function fetchSettings() {
    try {
        const { data, error } = await db.from('settings').select('*');
        if (error) throw error;
        const settingsObj = {};
        data.forEach(item => { settingsObj[item.key_name] = item.value; });
        return settingsObj;
    } catch (error) {
        console.error('Error fetching settings:', error.message);
        return {};
    }
}

/* ============================================================
   Order Submission
   ============================================================ */
async function submitOrder(orderData, cartItems) {
    try {
        const date = new Date();
        const orderNumber = `ZON-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: order, error: orderError } = await db
            .from('orders')
            .insert([{
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
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        const orderItems = cartItems.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsError } = await db.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;

        zonCart = [];
        localStorage.removeItem('zonCart');
        updateCartCount();

        return { success: true, orderNumber: orderNumber };

    } catch (error) {
        console.error('Error submitting order:', error.message);
        return { success: false, error: error.message };
    }
}

/* ============================================================
   Cart Management
   ============================================================ */
function addToCart(product, quantity = 1) {
    const existingItem = zonCart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        zonCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url || 'https://placehold.co/100x100/1A1A1A/E85D04?text=ZON',
            quantity: quantity
        });
    }
    
    localStorage.setItem('zonCart', JSON.stringify(zonCart));
    updateCartCount(true);
    showToast('Added to Cart', `${product.name} × ${quantity}`, 'success');
}

function removeFromCart(productId) {
    const item = zonCart.find(i => i.id === productId);
    zonCart = zonCart.filter(item => item.id !== productId);
    localStorage.setItem('zonCart', JSON.stringify(zonCart));
    updateCartCount();
    if (item) showToast('Removed from Cart', item.name, 'info');
}

function getCartTotal() {
    return zonCart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateCartCount(bump = false) {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const totalItems = zonCart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElements.forEach(el => {
        el.textContent = totalItems;
        if (bump) {
            el.classList.remove('bump');
            void el.offsetWidth;
            el.classList.add('bump');
        }
    });
}

/* ============================================================
   Render Products
   ============================================================ */
function renderProductGrid(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<p class="text-gray-500 col-span-full text-center py-10">No products found.</p>`;
        return;
    }

    container.innerHTML = products.map(product => {
        let badgeClass = 'badge-in-stock';
        let badgeText = 'In Stock';
        if (product.stock_quantity <= 0) {
            badgeClass = 'badge-out-stock'; badgeText = 'Out of Stock';
        } else if (product.stock_quantity <= product.reorder_level) {
            badgeClass = 'badge-low-stock'; badgeText = 'Low Stock';
        }

        const imageUrl = product.image_url || 'https://placehold.co/400x400/1A1A1A/E85D04?text=ZON';
        const isOut = product.stock_quantity <= 0;

        return `
            <div class="product-card">
                <div class="product-image-wrapper">
                    <a href="product.html?id=${product.id}">
                        <img src="${imageUrl}" alt="${product.name}">
                    </a>
                    <span class="badge-stock ${badgeClass} absolute top-3 left-3">${badgeText}</span>
                    ${!isOut ? `
                        <button onclick='event.preventDefault(); addToCart(${JSON.stringify(product).replace(/'/g, "&apos;")})' class="quick-add">
                            + Quick Add
                        </button>
                    ` : ''}
                </div>
                <div class="p-4 flex-1 flex flex-col">
                    <p class="text-xs font-semibold text-[var(--zon-accent)] mb-1 uppercase tracking-wide">${product.categories?.name || 'General'}</p>
                    <a href="product.html?id=${product.id}" onclick="event.stopPropagation();">
                        <h4 class="font-bold text-base leading-tight mb-2">${product.name}</h4>
                    </a>
                    <div class="mt-auto pt-3 flex justify-between items-center">
                        <span class="font-bold text-lg text-[var(--zon-primary)]">${formatRWF(product.price)}</span>
                        <a href="product.html?id=${product.id}" onclick="event.stopPropagation();" class="text-xs font-semibold text-gray-500 hover:text-[var(--zon-primary)]">View →</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ============================================================
   Initialize
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    initPageLoader();
    updateCartCount();
});