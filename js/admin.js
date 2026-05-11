const ADMIN_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCIdRKoALvfMgIRlYjvpckRQzyWGYXSu4w",
    authDomain: "matrixcheat-0011.firebaseapp.com",
    projectId: "matrixcheat-0011",
    storageBucket: "matrixcheat-0011.firebasestorage.app",
    messagingSenderId: "398069626242",
    appId: "1:398069626242:web:7979c93b79b40b95138b9b"
};

let adminDb, adminAuth, adminFirebaseReady;

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(ADMIN_FIREBASE_CONFIG);
    adminDb = firebase.firestore();
    adminAuth = firebase.auth();
    adminFirebaseReady = true;
} else {
    console.log('Firebase not loaded in admin context');
}

let adminProducts = [];

function openAdmin() {
    document.getElementById('adminOverlay').classList.add('active');
}

function closeAdmin() {
    document.getElementById('adminOverlay').classList.remove('active');
}

function showAdminSection(section) {
    document.querySelectorAll('.admin-nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
    
    const clickedBtn = event.target;
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
    
    const sectionEl = document.getElementById(section);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }
    
    const titles = {
        dashboard: 'Dashboard',
        products: 'Ürün Yönetimi',
        orders: 'Siparişler',
        users: 'Kullanıcılar'
    };
    const titleEl = document.querySelector('.admin-title');
    if (titleEl) {
        titleEl.textContent = titles[section] || 'Admin Panel';
    }
}

async function loadAdminProducts() {
    const stored = localStorage.getItem('matrixProducts');
    if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
            adminProducts = parsed;
            renderProductsEdit();
            return;
        }
    }
    if (window.firebaseReady && window.db) {
        try {
            const doc = await window.db.collection('products').doc('products_list').get();
            if (doc.exists) {
                adminProducts = doc.data().products || [];
                renderProductsEdit();
                return;
            }
        } catch (e) {
            console.log('Firebase load error');
        }
    }
    adminProducts = [];
    renderProductsEdit();
}

async function loadAdminData() {
    if (!adminFirebaseReady) {
        document.getElementById('statOrders').textContent = '-';
        document.getElementById('statPending').textContent = '-';
        document.getElementById('statUsers').textContent = '-';
        document.getElementById('statRevenue').textContent = '-';
        return;
    }
    
    try {
        const [supportSnapshot, usersSnapshot, ordersSnapshot] = await Promise.all([
            adminDb.collection('support_requests').get(),
            adminDb.collection('users').get(),
            adminDb.collection('orders').get()
        ]);
        
        const requests = supportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const totalOrders = requests.length;
        const pendingOrders = requests.filter(r => r.status === 'Yeni' || r.status === 'İnceleniyor').length;
        const totalUsers = users.length;
        
        let revenue = 0;
        requests.forEach(req => {
            const priceMap = { '1 Gün': 49, '1 Hafta': 149, '1 Ay': 299, 'day': 49, 'week': 149, 'month': 299 };
            const price = priceMap[req.package] || 0;
            revenue += price;
        });
        
        document.getElementById('statOrders').textContent = totalOrders;
        document.getElementById('statPending').textContent = pendingOrders;
        document.getElementById('statUsers').textContent = totalUsers;
        document.getElementById('statRevenue').textContent = '₺' + revenue.toLocaleString('tr-TR');
        
        renderProductsEdit();
        renderRequests(requests);
        renderUsers(users);
    } catch (e) {
        console.error('Admin data load error:', e);
        showMessage('Veriler yüklenirken hata oluştu!', 'error');
    }
}

function renderRequests(requests) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #808080;">Henüz sipariş talebi yok.</div>';
        return;
    }
    
    container.innerHTML = requests.map(req => {
        const statusClass = req.status === 'Yeni' ? 'pending' : req.status === 'İnceleniyor' ? 'pending' : req.status === 'Tamamlandı' ? 'completed' : 'cancelled';
        const date = req.createdAt ? new Date(req.createdAt.seconds ? req.createdAt.seconds * 1000 : req.createdAt).toLocaleDateString('tr-TR') : '-';
        
        return `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">#${req.id.slice(0, 8).toUpperCase()}</span>
                <span class="order-date">${date}</span>
            </div>
            <div class="order-details">
                <div class="order-detail-item">
                    <label>Oyun</label>
                    <span>${req.game || '-'}</span>
                </div>
                <div class="order-detail-item">
                    <label>Paket</label>
                    <span>${req.package || '-'}</span>
                </div>
                <div class="order-detail-item">
                    <label>Sipariş No</label>
                    <span>${req.orderNumber || '-'}</span>
                </div>
            </div>
            <div class="order-details">
                <div class="order-detail-item">
                    <label>Müşteri</label>
                    <span>${req.userEmail || '-'}</span>
                </div>
                <div class="order-detail-item">
                    <label>Durum</label>
                    <span class="status-badge status-${statusClass}">${req.status || 'Yeni'}</span>
                </div>
            </div>
            ${req.note ? `<div style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin-top: 10px;"><label style="color: #808080; font-size: 0.8rem;">Not:</label><p style="color: #e0e0e0; margin-top: 5px;">${req.note}</p></div>` : ''}
            <div class="order-actions">
                <button class="action-btn" onclick="updateRequestStatus('${req.id}', 'İnceleniyor')">⏳ İnceleniyor</button>
                <button class="action-btn" onclick="updateRequestStatus('${req.id}', 'Tamamlandı')">✓ Tamamlandı</button>
                <button class="action-btn danger" onclick="updateRequestStatus('${req.id}', 'İptal')">✕ İptal</button>
            </div>
        </div>
    `}).join('');
}

async function updateRequestStatus(requestId, status) {
    if (!adminFirebaseReady) {
        showMessage('Firebase bağlı değil!', 'error');
        return;
    }
    try {
        await adminDb.collection('support_requests').doc(requestId).update({ status: status });
        showMessage('Durum güncellendi!', 'success');
        loadAdminData();
    } catch (e) {
        showMessage('Hata: ' + e.message, 'error');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (!users || users.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #808080;">Henüz kullanıcı yok.</div>';
        return;
    }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>E-posta</th>
                    <th>İsim</th>
                    <th>Admin</th>
                    <th>Kayıt Tarihi</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => {
                    const date = user.createdAt ? new Date(user.createdAt.seconds ? user.createdAt.seconds * 1000 : user.createdAt).toLocaleDateString('tr-TR') : '-';
                    return `
                    <tr>
                        <td>${user.email || '-'}</td>
                        <td>${user.displayName || '-'}</td>
                        <td><span class="status-badge status-${user.isAdmin ? 'completed' : 'cancelled'}">${user.isAdmin ? 'Admin' : 'Kullanıcı'}</span></td>
                        <td>${date}</td>
                        <td>
                            <button class="action-btn" onclick="toggleUserAdmin('${user.email}', ${!user.isAdmin})">${user.isAdmin ? 'Admin Kaldır' : 'Admin Yap'}</button>
                        </td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function toggleUserAdmin(email, makeAdmin) {
    if (!adminFirebaseReady) {
        showMessage('Firebase bağlı değil!', 'error');
        return;
    }
    try {
        const snapshot = await adminDb.collection('users').where('email', '==', email).get();
        if (!snapshot.empty) {
            await adminDb.collection('users').doc(snapshot.docs[0].id).update({ isAdmin: makeAdmin });
            showMessage(makeAdmin ? 'Kullanıcı admin yapıldı!' : 'Admin yetkisi kaldırıldı!', 'success');
            loadAdminData();
        }
    } catch (e) {
        showMessage('Hata: ' + e.message, 'error');
    }
}

function renderProductsEdit() {
    const container = document.getElementById('productsEditList');
    if (!container) return;
    
    if (adminProducts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #808080;">Ürün yok. "Yeni Ürün" butonuna tıklayarak ekleyin.</div>';
        return;
    }
    
    container.innerHTML = adminProducts.map((product, index) => `
        <div class="product-edit-card">
            <div class="product-edit-header">
                <div class="product-edit-title">${product.icon || '🎮'} ${product.title || 'Ürün'}</div>
                <button class="action-btn danger" onclick="deleteAdminProduct(${product.id})">🗑️ Sil</button>
            </div>
            <div class="form-row">
                <div class="admin-form-group">
                    <label>İkon (Emoji)</label>
                    <input type="text" id="icon_${product.id}" value="${product.icon || '🎮'}" style="width: 60px; text-align: center; font-size: 1.5rem;">
                </div>
                <div class="admin-form-group">
                    <label>Başlık</label>
                    <input type="text" id="title_${product.id}" value="${product.title || ''}">
                </div>
            </div>
            <div class="admin-form-group">
                <label>Açıklama</label>
                <textarea id="desc_${product.id}">${product.desc || ''}</textarea>
            </div>
            <div class="form-row-3">
                <div class="admin-form-group">
                    <label>1 Gün Fiyatı (₺)</label>
                    <input type="number" id="price_day_${product.id}" value="${product.prices?.day || 0}">
                </div>
                <div class="admin-form-group">
                    <label>1 Hafta Fiyatı (₺)</label>
                    <input type="number" id="price_week_${product.id}" value="${product.prices?.week || 0}">
                </div>
                <div class="admin-form-group">
                    <label>1 Ay Fiyatı (₺)</label>
                    <input type="number" id="price_month_${product.id}" value="${product.prices?.month || 0}">
                </div>
            </div>
            
            <div class="admin-form-group">
                <label>◈ ÖZELLİKLER ◈</label>
                <div id="features_${product.id}" class="features-edit-list">
                    ${(product.features || []).map((f, fi) => `
                        <div class="feature-edit-item">
                            <input type="text" class="feature-input" id="feature_${product.id}_${fi}" value="${f}">
                            <button class="action-btn danger small" onclick="removeFeature(${product.id}, ${fi})">✕</button>
                        </div>
                    `).join('')}
                </div>
                <button class="action-btn" onclick="addFeature(${product.id})" style="margin-top: 10px;">+ Özellik Ekle</button>
            </div>
            
            <div class="admin-form-group" style="margin-top: 20px;">
                <label>◈ SİSTEM GEREKSİNİMLERİ ◈</label>
                <div class="form-row" style="margin-top: 10px;">
                    <input type="text" id="sys_os_${product.id}" value="${product.systemReq?.os || 'Windows 10/11'}" placeholder="İşletim Sistemi">
                    <input type="text" id="sys_cpu_${product.id}" value="${product.systemReq?.processor || 'Intel Core i5'}" placeholder="İşlemci">
                </div>
                <div class="form-row">
                    <input type="text" id="sys_ram_${product.id}" value="${product.systemReq?.ram || '8GB'}" placeholder="RAM">
                    <input type="text" id="sys_gpu_${product.id}" value="${product.systemReq?.gpu || 'GTX 1050'}" placeholder="Ekran Kartı">
                </div>
                <input type="text" id="sys_storage_${product.id}" value="${product.systemReq?.storage || '500MB'}" placeholder="Depolama" style="margin-top: 10px;">
            </div>
        </div>
    `).join('');
}

function addNewProduct() {
    const newId = Math.max(...adminProducts.map(p => p.id), 0) + 1;
    const newProduct = {
        id: newId,
        icon: '🎮',
        image: '',
        title: 'YENİ ÜRÜN',
        desc: 'Ürün açıklaması',
        features: ['Aim Assist - Hassas nişan sistemi', 'ESP - Oyuncu görünürlüğü', 'Skin Changer - Karakter görünümü', 'Anti-Ban koruma'],
        prices: { day: 99, week: 249, month: 399 },
        systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050', storage: '500MB' }
    };
    adminProducts.push(newProduct);
    renderProductsEdit();
    showMessage('Yeni ürün eklendi! Düzenle ve kaydet.', 'success');
}

function deleteAdminProduct(productId) {
    showConfirm('ÜRÜN SİL', 'Bu ürünü silmek istediğinizden emin misiniz?', () => {
        adminProducts = adminProducts.filter(p => p.id !== productId);
        renderProductsEdit();
    });
}

function addFeature(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (!product.features) {
        product.features = [];
    }
    product.features.push('Yeni özellik');
    renderProductsEdit();
    
    setTimeout(() => {
        const newInput = document.getElementById(`feature_${productId}_${product.features.length - 1}`);
        if (newInput) newInput.focus();
    }, 50);
}

function removeFeature(productId, featureIndex) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product || !product.features) return;
    
    product.features.splice(featureIndex, 1);
    renderProductsEdit();
}

async function saveAllAdminProducts() {
    if (adminProducts.length === 0) {
        showMessage('Kaydedilecek ürün yok!', 'warning');
        return;
    }
    
    const updatedProducts = adminProducts.map(product => {
        const iconEl = document.getElementById(`icon_${product.id}`);
        const titleEl = document.getElementById(`title_${product.id}`);
        const descEl = document.getElementById(`desc_${product.id}`);
        const dayPriceEl = document.getElementById(`price_day_${product.id}`);
        const weekPriceEl = document.getElementById(`price_week_${product.id}`);
        const monthPriceEl = document.getElementById(`price_month_${product.id}`);
        const featuresContainer = document.getElementById(`features_${product.id}`);
        
        const sysOsEl = document.getElementById(`sys_os_${product.id}`);
        const sysCpuEl = document.getElementById(`sys_cpu_${product.id}`);
        const sysRamEl = document.getElementById(`sys_ram_${product.id}`);
        const sysGpuEl = document.getElementById(`sys_gpu_${product.id}`);
        const sysStorageEl = document.getElementById(`sys_storage_${product.id}`);
        
        let features = product.features || [];
        if (featuresContainer) {
            const featureInputs = featuresContainer.querySelectorAll('.feature-input');
            features = Array.from(featureInputs).map(input => input.value.trim()).filter(f => f.length > 0);
        }
        
        return {
            ...product,
            icon: iconEl ? iconEl.value : product.icon,
            title: titleEl ? titleEl.value : product.title,
            desc: descEl ? descEl.value : product.desc,
            features: features,
            prices: {
                day: parseInt(dayPriceEl?.value) || product.prices?.day || 0,
                week: parseInt(weekPriceEl?.value) || product.prices?.week || 0,
                month: parseInt(monthPriceEl?.value) || product.prices?.month || 0
            },
            systemReq: {
                os: sysOsEl?.value || 'Windows 10/11',
                processor: sysCpuEl?.value || 'Intel Core i5',
                ram: sysRamEl?.value || '8GB',
                gpu: sysGpuEl?.value || 'GTX 1050',
                storage: sysStorageEl?.value || '500MB'
            }
        };
    });
    
    localStorage.setItem('matrixProducts', JSON.stringify(updatedProducts));
    adminProducts = updatedProducts;
    
    if (adminFirebaseReady && adminDb) {
        try {
            await adminDb.collection('products').doc('products_list').set({
                products: updatedProducts,
                updatedAt: new Date()
            });
            showMessage(`${adminProducts.length} ürün başarıyla kaydedildi!`, 'success');
        } catch (e) {
            console.error('Firebase save error:', e);
            showMessage('Ürünler kaydedildi ama Firebase\'e yüklenirken hata oldu.', 'warning');
        }
    } else {
        showMessage(`${adminProducts.length} ürün başarıyla kaydedildi!`, 'success');
    }
}

window.addEventListener('load', function() {
    loadAdminProducts();
});