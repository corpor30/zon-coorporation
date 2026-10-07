/* ZON CORPORATION — LEGAL DOCUMENTS */
const LEGAL_DOCS = {
    terms: {
        title: 'Terms of Service',
        updated: 'October 2026',
        html: `
            <h2>1. Introduction</h2>
            <p>Welcome to Zon Corporation Rwanda Limited. These Terms govern your use of zoncorp.rw and all products and services offered through it.</p>
            <h2>2. About Us</h2>
            <p>Zon Corporation Rwanda Limited is a technology and electronics trading company registered in Rwanda, located in Gisozi, Kigali.</p>
            <h2>3. Eligibility</h2>
            <p>You must be at least 18 years old to place an order.</p>
            <h2>4. Products and Pricing</h2>
            <p>All prices are in Rwandan Francs (RWF) and include VAT. We reserve the right to modify prices without prior notice.</p>
            <h2>5. Orders</h2>
            <p>An order is confirmed only when we issue an order number.</p>
            <h2>6. Payment</h2>
            <p>We accept MTN Mobile Money, Airtel Money, and Cash on Delivery.</p>
            <h2>7. Delivery</h2>
            <p>See our Shipping Policy for details. Delivery is available across Rwanda.</p>
            <h2>8. Returns</h2>
            <p>See our Refund & Returns Policy.</p>
            <h2>9. Warranty</h2>
            <p>Most products carry a 1-2 year manufacturer warranty.</p>
            <h2>10. Intellectual Property</h2>
            <p>All content is property of Zon Corporation Rwanda Limited.</p>
            <h2>11. Liability</h2>
            <p>To the extent permitted by Rwandan law, we are not liable for indirect damages.</p>
            <h2>12. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Rwanda.</p>
            <h2>13. Contact</h2>
            <p>Email: contact@zoncorp.rw · Phone: +250 790 696 865</p>
        `
    },
    privacy: {
        title: 'Privacy Policy',
        updated: 'October 2026',
        html: `
            <p>Compliant with Law No. 058/2021 on data protection in Rwanda.</p>
            <h2>1. Information We Collect</h2>
            <p>Name, phone, email, address, and order history when you place an order.</p>
            <h2>2. How We Use It</h2>
            <p>To process orders, deliver products, and improve our services.</p>
            <h2>3. Sharing</h2>
            <p>We never sell your data. We only share with delivery personnel and payment providers.</p>
            <h2>4. Retention</h2>
            <p>Order records retained for 5 years per Rwandan tax law.</p>
            <h2>5. Your Rights</h2>
            <p>Access, correct, or delete your data by emailing contact@zoncorp.rw.</p>
            <h2>6. Security</h2>
            <p>HTTPS encryption and secure database storage.</p>
            <h2>7. Contact</h2>
            <p>contact@zoncorp.rw · +250 790 696 865</p>
        `
    },
    refund: {
        title: 'Refund & Returns Policy',
        updated: 'October 2026',
        html: `
            <h2>1. Return Window</h2>
            <p>7 days from delivery for unused products in original packaging.</p>
            <h2>2. Non-Returnable</h2>
            <p>Damaged by misuse, opened seals, custom orders, clearance items.</p>
            <h2>3. Defective Items</h2>
            <p>Notify us within 48 hours of delivery with photos for full replacement or refund.</p>
            <h2>4. Warranty Claims</h2>
            <p>Contact us with your order number and fault description.</p>
            <h2>5. Return Shipping</h2>
            <p>We cover shipping on defects. Customer covers change-of-mind returns.</p>
            <h2>6. Refund Processing</h2>
            <p>Mobile Money: 3-5 days. Cash: at our Gisozi store.</p>
            <h2>7. Contact</h2>
            <p>WhatsApp +250 790 696 865 · contact@zoncorp.rw</p>
        `
    },
    shipping: {
        title: 'Shipping & Delivery Policy',
        updated: 'October 2026',
        html: `
            <h2>1. Zones</h2>
            <p>Kigali: same-day (orders before 3pm). Outside Kigali: 1-2 days.</p>
            <h2>2. Fees</h2>
            <p>Kigali: 2,000 RWF. Outside: 5,000 RWF. Free over 50,000 RWF.</p>
            <h2>3. Processing</h2>
            <p>Mon-Sat 8am-6pm. Sunday orders processed next business day.</p>
            <h2>4. Failed Delivery</h2>
            <p>Two attempts, then return to store. Re-delivery may incur a fee.</p>
            <h2>5. Tracking</h2>
            <p>WhatsApp +250 790 696 865 with your order number.</p>
        `
    }
};

function renderLegal(slug) {
    const container = document.getElementById('legal-content');
    if (!container) {
        console.warn('[legal] #legal-content not found');
        return;
    }
    const doc = LEGAL_DOCS[slug];
    if (!doc) {
        container.innerHTML = '<h1>Document not found</h1>';
        return;
    }
    container.innerHTML = `
        <div class="legal-header mb-10">
            <span class="text-xs font-bold tracking-[0.25em] uppercase text-[var(--zon-primary)]">Legal</span>
            <h1 class="text-4xl md:text-5xl font-bold mt-3 mb-2">${doc.title}</h1>
            <p class="text-sm text-gray-500">Last updated: ${doc.updated}</p>
        </div>
        <div class="legal-body prose prose-lg" style="max-width: 100%; color: #52556B; line-height: 1.7;">
            ${doc.html}
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}