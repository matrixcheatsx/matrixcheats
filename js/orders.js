let userOrders = [];
let currentFilter = 'all';
let currentSort = 'newest';

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function filterAndSortOrders() {
    let filtered = [...userOrders];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(o => o.status === currentFilter);
    }
    
    filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
}

function setFilter(value) {
    currentFilter = value;
    renderOrders();
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
    
    const userUid = user?.uid || user?._delegate?.uid || user?.user?.uid;
    
    if (!user || !userUid) {
        showAuthRequired(container);
        return;
    }
    
    if (typeof getOrdersByUser === 'function') {
        userOrders = await getOrdersByUser(userUid);
    }
    
    const displayOrders = filterAndSortOrders();
    
    if (displayOrders.length === 0) {
        const filterMsg = currentFilter !== 'all' ? '<p style="margin-top:10px;">Seçili durumda sipariş bulunamadı.</p>' : '';
        container.innerHTML = `
            <div class="empty-orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p>Siparişiniz bulunmuyor.</p>
                ${filterMsg}
            </div>
        `;
        return;
    }
    
    container.innerHTML = displayOrders.map(order => {
                <p>Henüz bir siparişiniz bulunmuyor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = userOrders.map(order => {
        const statusClass = order.status === 'Tamamlandı' || order.status === 'completed' ? 'status-completed' : 
                          order.status === 'Beklemede' || order.status === 'pending' ? 'status-pending' : 'status-processing';
        
        const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-';
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">${escapeHTML(order.id)}</span>
                    <span class="order-status ${statusClass}">${escapeHTML(order.status)}</span>
                </div>
                <div class="order-body">
                    <div class="order-detail">
                        <span class="order-detail-label">Ürün</span>
                        <span class="order-detail-value">${escapeHTML(order.productName || order.product)}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Paket</span>
                        <span class="order-detail-value">${escapeHTML(order.duration)}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Tarih</span>
                        <span class="order-detail-value">${orderDate}</span>
                    </div>
                    <div class="order-detail">
                        <span class="order-detail-label">Lisans Anahtarı</span>
                        <span class="order-detail-value" style="color:${order.licenseKey ? '#00ff41' : '#ffc107'}">${escapeHTML(order.licenseKey || 'Hazırlanıyor')}</span>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-total">₺${escapeHTML(order.totalPrice || order.price)}</span>
                    <div class="order-actions">
                        <button class="order-btn" onclick="viewOrder('${escapeHTML(order.id)}')">Detay</button>
                        ${order.licenseKey ? `<button class="order-btn primary" onclick="downloadProduct('${escapeHTML(order.id)}')">İndir</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showAuthRequired(container) {
    container.innerHTML = `
        <div class="empty-orders">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <p>Siparişlerinizi görmek için giriş yapmalısınız.</p>
            <a href="../index.html" class="error-btn" style="margin-top: 20px; display: inline-block;">Giriş Yap</a>
        </div>
    `;
}

function trackOrder() {
    const orderId = document.getElementById('orderSearchInput').value.trim().toUpperCase();
    const resultDiv = document.getElementById('trackingResult');
    const detailsDiv = document.getElementById('trackingDetails');
    
    if (!resultDiv || !detailsDiv) return;
    
    if (!orderId || orderId.length < 5) {
        showMessage('Geçerli bir sipariş numarası girin!', 'error');
        return;
    }
    
    if (userOrders.length > 0) {
        const order = userOrders.find(o => o.id === orderId);
        if (order) {
            displayTrackingResult(order);
            return;
        }
    }
    
    trackOrderPublic(orderId);
}

async function trackOrderPublic(orderId) {
    const detailsDiv = document.getElementById('trackingDetails');
    
    if (!window.db) {
        showMessage('Veritabanı bağlantısı yok!', 'error');
        return;
    }
    
    detailsDiv.innerHTML = '<p style="color:#00d4ff;">Sipariş aranıyor...</p>';
    
    try {
        const ordersRef = window.db.collection('orders');
        const snapshot = await ordersRef.where('orderId', '==', orderId).limit(1).get();
        
        if (snapshot.empty) {
            detailsDiv.innerHTML = '<p style="color:#ff0040;">Sipariş bulunamadı. Sipariş numaranızı kontrol edin.</p>';
            return;
        }
        
        let orderData = null;
        snapshot.forEach(doc => {
            orderData = { id: doc.id, ...doc.data() };
        });
        
        displayTrackingResult(orderData);
    } catch (error) {
        console.error('Sipariş arama hatası:', error);
        detailsDiv.innerHTML = '<p style="color:#ff0040;">Sipariş aranırken hata oluştu.</p>';
    }
}

function displayTrackingResult(order) {
    const detailsDiv = document.getElementById('trackingDetails');
    if (!detailsDiv) return;
    
    const statusClass = order.status === 'Tamamlandı' || order.status === 'completed' ? 'status-completed' : 
                      order.status === 'Beklemede' || order.status === 'pending' ? 'status-pending' : 'status-processing';
    
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-';
    const eta = calculateETA(order);
    
    detailsDiv.innerHTML = `
        <div class="tracking-info">
            <div class="info-row"><span>Sipariş No:</span><span class="accent">${escapeHTML(order.orderId || order.id)}</span></div>
            <div class="info-row"><span>Ürün:</span><span>${escapeHTML(order.productName || order.product)}</span></div>
            <div class="info-row"><span>Paket:</span><span>${escapeHTML(order.duration)}</span></div>
            <div class="info-row"><span>Tarih:</span><span>${orderDate}</span></div>
            <div class="info-row"><span>Tutar:</span><span class="price">₺${escapeHTML(order.totalPrice || order.price)}</span></div>
            <div class="info-row"><span>Durum:</span><span class="order-status ${statusClass}">${escapeHTML(order.status)}</span></div>
            ${eta ? `<div class="info-row"><span>Tahmini:</span><span>${eta}</span></div>` : ''}
            ${order.licenseKey ? `<div class="info-row"><span>Lisans:</span><span class="license-key">${escapeHTML(order.licenseKey)}</span></div>` : ''}
        </div>
    `;
    
    updateTrackingTimeline(order);
}

function calculateETA(order) {
    if (order.status === 'Tamamlandı' || order.status === 'completed') return null;
    
    const durations = { '1 Gün': 1, '1 Hafta': 7, '1 Ay': 30 };
    const duration = durations[order.duration] || 1;
    
    if (order.createdAt) {
        const created = new Date(order.createdAt);
        const eta = new Date(created.getTime() + duration * 24 * 60 * 60 * 1000);
        const now = new Date();
        
        if (eta > now) {
            const hoursLeft = Math.ceil((eta - now) / (1000 * 60 * 60));
            if (hoursLeft < 24) return `${hoursLeft} saat içinde`;
            return `${Math.ceil(hoursLeft / 24)} gün içinde`;
        }
    }
    return 'Hazırlanıyor';
}

function updateTrackingTimeline(order) {
    const steps = [
        { key: 'Sipariş Alındı', done: true },
        { key: 'Ödeme Onaylandı', done: order.paymentStatus === 'completed' || order.status !== 'Beklemede' },
        { key: 'Hazırlanıyor', done: order.status === 'İşleniyor' || order.status === 'processing' || order.status === 'Tamamlandı' || order.status === 'completed' },
        { key: 'Teslim Edildi', done: order.status === 'Tamamlandı' || order.status === 'completed' }
    ];
    
    const stepsContainer = document.querySelector('.tracking-steps');
    if (!stepsContainer) return;
    
    stepsContainer.innerHTML = steps.map((step, i) => `
        <div class="tracking-step ${step.done ? 'completed' : ''}">
            <div class="step-icon">${step.done ? '✓' : i + 1}</div>
            <div class="step-content">
                <h4>${step.key}</h4>
            </div>
        </div>
    `).join('');
}

function viewOrder(orderId) {
    const order = userOrders.find(o => o.id === orderId);
    if (order) {
        showMessage(`Sipariş No: ${order.id}<br>Ürün: ${order.productName || order.product}<br>Paket: ${order.duration}<br>Tarih: ${order.createdAt}<br>Durum: ${order.status}`, 'info', 6000);
    }
}

function downloadProduct(orderId) {
    showMessage('Ürün indirme sayfasına yönlendiriliyorsunuz...', 'info');
}