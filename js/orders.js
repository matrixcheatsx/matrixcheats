let userOrders = [];
let currentSort = 'newest';

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function setSort(value) {
    currentSort = value;
    renderOrders();
}

async function renderOrders() {
    const container = document.getElementById('orderList');
    if (!container) return;

    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;

    const userEmail = user?.email || user?._delegate?.email || '';

    if (!user || !userEmail) {
        container.innerHTML = `
            <div class="empty-orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p>Satın aldıklarınızı görmek için giriş yapmalısınız.</p>
                <a href="../index.html" class="error-btn" style="margin-top: 20px; display: inline-block;">Giriş Yap</a>
            </div>
        `;
        return;
    }

    userOrders = [];

    const promises = [];

    if (typeof getOrderConfirmations === 'function') {
        promises.push(
            getOrderConfirmations().then(all => {
                const filtered = all.filter(c =>
                    c.status === 'Onaylandı' &&
                    (c.userEmail === userEmail || c.gmail === userEmail)
                );
                filtered.forEach(c => c._source = 'onay');
                return filtered;
            }).catch(() => [])
        );
    }

    if (typeof getSupportRequests === 'function' && window.db) {
        promises.push(
            getSupportRequests().then(all => {
                const filtered = all.filter(r =>
                    r.status === 'Tamamlandı' &&
                    r.userEmail === userEmail &&
                    r.licenseKey
                );
                filtered.forEach(r => r._source = 'talep');
                return filtered;
            }).catch(() => [])
        );
    }

    const results = await Promise.all(promises);
    userOrders = results.flat();

    if (userOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p>Henüz satın aldığınız ürün bulunmuyor.</p>
                <p style="font-size:0.85rem;color:#666;margin-top:10px;">Sipariş onaylattıktan sonra admin tarafından onaylanan ürünleriniz burada görünecektir.</p>
            </div>
        `;
        return;
    }

    userOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt.seconds ? b.createdAt.seconds * 1000 : b.createdAt).getTime() : 0;
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    container.innerHTML = userOrders.map(order => {
        const orderDate = order.createdAt
            ? new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString('tr-TR')
            : '-';

        const licenseKey = order.licenseKey || '';
        const product = order.product || order.game || '-';
        const orderNumber = order.orderNumber || order.id || '-';

        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">${escapeHTML(orderNumber)}</span>
                    <span class="order-status status-completed">ONAYLANDI</span>
                </div>
                <div class="order-body">
                    <div class="order-detail">
                        <span class="order-detail-label">Ürün</span>
                        <span class="order-detail-value">${escapeHTML(product)}</span>
                    </div>
                    ${licenseKey ? `
                    <div class="order-detail">
                        <span class="order-detail-label">Lisans Anahtarı</span>
                        <span class="order-detail-value" style="color:#00ffff;font-family:monospace;font-size:1.1rem;letter-spacing:2px;">${escapeHTML(licenseKey)}</span>
                    </div>` : ''}
                    <div class="order-detail">
                        <span class="order-detail-label">Tarih</span>
                        <span class="order-detail-value">${orderDate}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', function() {
    renderOrders();
});
