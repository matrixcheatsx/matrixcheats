let adminProducts = [];
let refreshInterval = null;

function waitForFirebase(retries = 20) {
    return new Promise((resolve) => {
        if (window.firebaseReady) return resolve(true);
        let c = 0;
        const iv = setInterval(() => {
            c++;
            if (window.firebaseReady) { clearInterval(iv); resolve(true); }
            else if (c >= retries) { clearInterval(iv); resolve(false); }
        }, 250);
    });
}

async function initAdmin() {
    const ready = await waitForFirebase();
    if (!ready) console.warn('Firebase not available, using local data only');

    const stored = localStorage.getItem('matrixProducts');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                adminProducts = parsed;
                renderProductsEdit();
            }
        } catch (e) {}
    }

    if (adminProducts.length === 0 && ready && window.getProductsFromDB) {
        try {
            const dbProducts = await window.getProductsFromDB();
            if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
                adminProducts = dbProducts;
                renderProductsEdit();
            }
        } catch (e) {}
    }

    loadAdminData();
    startAutoRefresh();
}

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        const active = document.querySelector('.admin-section.active');
        if (active) {
            const id = active.id;
            if (id === 'secDashboard') loadAdminData();
            if (id === 'secOrders') loadSupportRequests();
        }
    }, 30000);
}

async function loadAdminData() {
    setLastUpdated();
    setLoading('statsContainer', true);

    const productCount = adminProducts.length || (() => {
        try {
            const s = localStorage.getItem('matrixProducts');
            return s ? JSON.parse(s).length : 0;
        } catch { return 0; }
    })();

    if (!window.firebaseReady || !window.db) {
        document.getElementById('statOrders').textContent = '-';
        document.getElementById('statPending').textContent = '-';
        document.getElementById('statUsers').textContent = '-';
        document.getElementById('statRevenue').textContent = '₺0';
        document.getElementById('statProducts') && (document.getElementById('statProducts').textContent = productCount);
        document.getElementById('statToday') && (document.getElementById('statToday').textContent = '-');
        setLoading('statsContainer', false);
        return;
    }

    try {
        const [supportSnap, usersSnap] = await Promise.all([
            window.db.collection('support_requests').get(),
            window.db.collection('users').get()
        ]);

        const requests = supportSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'Yeni' || r.status === 'İnceleniyor').length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = requests.filter(r => {
            const d = r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000) : new Date(r.createdAt);
            return d >= today;
        }).length;

        let revenue = 0;
        requests.forEach(r => {
            const pkg = r.package || '';
            if (pkg.includes('Ay') || pkg === 'month') revenue += 299;
            else if (pkg.includes('Hafta') || pkg === 'week') revenue += 149;
            else if (pkg.includes('Gün') || pkg === 'day') revenue += 49;
        });

        document.getElementById('statOrders').textContent = total;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statUsers').textContent = users.length;
        document.getElementById('statRevenue').textContent = '₺' + revenue.toLocaleString('tr-TR');
        document.getElementById('statProducts') && (document.getElementById('statProducts').textContent = productCount);
        document.getElementById('statToday') && (document.getElementById('statToday').textContent = todayOrders);
    } catch (e) {
        console.error('Admin load error:', e);
    }
    setLoading('statsContainer', false);
}

function setLoading(id, loading) {
    const el = document.getElementById(id);
    if (!el) return;
    if (loading) {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    } else {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    }
}

function setLastUpdated() {
    const el = document.getElementById('headerStatus');
    if (el) el.textContent = 'Son: ' + new Date().toLocaleTimeString('tr-TR');
}

function renderProductsEdit() {
    const container = document.getElementById('productsEditList');
    if (!container) return;
    if (adminProducts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">Henüz ürün yok. "Yeni Ürün" ekleyin.</div></div>';
        return;
    }
    container.innerHTML = adminProducts.map((p, idx) => `
        <div class="product-card-edit">
            <div class="product-card-edit-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
                <div class="product-card-edit-title">
                    <span>${p.icon || '🎮'}</span>
                    <span id="editTitle_${p.id}">${p.title || 'Ürün'}</span>
                </div>
                <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteAdminProduct(${p.id})">🗑️ Sil</button>
            </div>
            <div class="product-card-edit-body">
                <div class="form-grid">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">İkon</label>
                            <input type="text" class="form-input form-input-sm" id="icon_${p.id}" value="${p.icon || '🎮'}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ürün Adı</label>
                            <input type="text" class="form-input" id="title_${p.id}" value="${p.title || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Açıklama</label>
                        <textarea class="form-textarea" id="desc_${p.id}">${p.desc || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">🖼️ Görsel URL</label>
                        <input type="text" class="form-input" id="image_${p.id}" value="${p.image || ''}" placeholder="https://ornek.com/resim.jpg" oninput="previewImage(${p.id})">
                        <div class="image-preview" id="preview_${p.id}">${p.image ? `<img src="${p.image}" onerror="this.parentElement.style.display='none'">` : ''}</div>
                    </div>
                    <div class="form-row-3">
                        <div class="form-group">
                            <label class="form-label">1 Gün (₺)</label>
                            <input type="number" class="form-input form-input-sm" id="price_day_${p.id}" value="${p.prices?.day || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">1 Hafta (₺)</label>
                            <input type="number" class="form-input form-input-sm" id="price_week_${p.id}" value="${p.prices?.week || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">1 Ay (₺)</label>
                            <input type="number" class="form-input form-input-sm" id="price_month_${p.id}" value="${p.prices?.month || 0}">
                        </div>
                    </div>
                    <div class="form-section">
                        <div class="form-section-title">◈ ÖZELLİKLER</div>
                        <div class="features-list" id="features_${p.id}">
                            ${(p.features || []).map((f, fi) => `
                                <div class="feature-item">
                                    <input type="text" class="form-input form-input-sm feature-input" id="feature_${p.id}_${fi}" value="${f}">
                                    <button class="btn btn-danger btn-xs" onclick="removeFeature(${p.id}, ${fi})">✕</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn btn-ghost btn-sm" onclick="addFeature(${p.id})" style="margin-top:6px;">+ Özellik Ekle</button>
                    </div>
                    <div class="form-section" style="border-color:rgba(255,0,64,0.2);">
                        <div class="form-section-title red">◈ SİSTEM GEREKSİNİMLERİ</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">İşletim Sistemi</label>
                                <input type="text" class="form-input form-input-sm" id="sys_os_${p.id}" value="${p.systemReq?.os || 'Windows 10/11'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">İşlemci</label>
                                <input type="text" class="form-input form-input-sm" id="sys_cpu_${p.id}" value="${p.systemReq?.processor || 'Intel Core i5'}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">RAM</label>
                                <input type="text" class="form-input form-input-sm" id="sys_ram_${p.id}" value="${p.systemReq?.ram || '8GB'}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Ekran Kartı</label>
                                <input type="text" class="form-input form-input-sm" id="sys_gpu_${p.id}" value="${p.systemReq?.gpu || 'GTX 1050'}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Depolama</label>
                            <input type="text" class="form-input form-input-sm" id="sys_storage_${p.id}" value="${p.systemReq?.storage || '500MB'}">
                        </div>
                        <div class="form-row-3" style="margin-top:8px;">
                            <div class="form-group">
                                <label class="form-label">💳 1 Gün Linki</label>
                                <input type="text" class="form-input form-input-sm" id="payment_day_${p.id}" value="${(p.paymentLinks?.day) || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">💳 1 Hafta Linki</label>
                                <input type="text" class="form-input form-input-sm" id="payment_week_${p.id}" value="${(p.paymentLinks?.week) || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">💳 1 Ay Linki</label>
                                <input type="text" class="form-input form-input-sm" id="payment_month_${p.id}" value="${(p.paymentLinks?.month) || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    adminProducts.forEach(p => { if (p.image) { const el = document.getElementById('preview_' + p.id); if (el) el.style.display = 'block'; } });
}

function previewImage(id) {
    const url = document.getElementById('image_' + id).value;
    const preview = document.getElementById('preview_' + id);
    if (url && /^https?:\/\//.test(url)) {
        preview.innerHTML = `<img src="${url}" onerror="this.parentElement.style.display='none'">`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

function addNewProduct() {
    const newId = Math.max(...adminProducts.map(p => p.id), 0) + 1;
    adminProducts.push({
        id: newId, icon: '🎮', image: '', title: 'YENİ ÜRÜN', desc: 'Ürün açıklaması',
        features: ['Aim Assist - Hassas nişan', 'ESP - Oyuncu görünürlüğü', 'Anti-Ban koruma'],
        prices: { day: 99, week: 249, month: 399 },
        systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050', storage: '500MB' },
        paymentLinks: { day: '', week: '', month: '' }
    });
    renderProductsEdit();
    setTimeout(() => {
        const cards = document.querySelectorAll('.product-card-edit');
        if (cards.length > 0) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function deleteAdminProduct(id) {
    adminProducts = adminProducts.filter(p => p.id !== id);
    renderProductsEdit();
}

function addFeature(id) {
    const p = adminProducts.find(x => x.id === id);
    if (!p) return;
    if (!p.features) p.features = [];
    p.features.push('Yeni özellik');
    renderProductsEdit();
    setTimeout(() => {
        const inputs = document.querySelectorAll(`#features_${id} .feature-input`);
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
}

function removeFeature(id, idx) {
    const p = adminProducts.find(x => x.id === id);
    if (!p || !p.features) return;
    p.features.splice(idx, 1);
    renderProductsEdit();
}

function validateImageUrl(url) {
    if (typeof url !== 'string' || !url.trim()) return '';
    try { const u = new URL(url.trim()); return (u.protocol === 'http:' || u.protocol === 'https:') ? url.trim() : ''; }
    catch { return ''; }
}

async function saveAllAdminProducts() {
    const updated = adminProducts.map(p => {
        const g = id => document.getElementById(id);
        const fc = document.getElementById('features_' + p.id);
        let features = p.features || [];
        if (fc) features = Array.from(fc.querySelectorAll('.feature-input')).map(i => i.value.trim()).filter(f => f.length > 0);
        return {
            ...p,
            icon: g('icon_' + p.id)?.value || p.icon,
            title: g('title_' + p.id)?.value || p.title,
            image: validateImageUrl(g('image_' + p.id)?.value || p.image || ''),
            desc: g('desc_' + p.id)?.value || p.desc,
            features,
            prices: {
                day: parseInt(g('price_day_' + p.id)?.value) || p.prices?.day || 0,
                week: parseInt(g('price_week_' + p.id)?.value) || p.prices?.week || 0,
                month: parseInt(g('price_month_' + p.id)?.value) || p.prices?.month || 0
            },
            paymentLinks: {
                day: g('payment_day_' + p.id)?.value || '',
                week: g('payment_week_' + p.id)?.value || '',
                month: g('payment_month_' + p.id)?.value || ''
            },
            systemReq: {
                os: g('sys_os_' + p.id)?.value || 'Windows 10/11',
                processor: g('sys_cpu_' + p.id)?.value || 'Intel Core i5',
                ram: g('sys_ram_' + p.id)?.value || '8GB',
                gpu: g('sys_gpu_' + p.id)?.value || 'GTX 1050',
                storage: g('sys_storage_' + p.id)?.value || '500MB'
            }
        };
    });
    localStorage.setItem('matrixProducts', JSON.stringify(updated));
    adminProducts = updated;
    if (window.firebaseReady && window.db) {
        try {
            await window.db.collection('products').doc('products_list').set({ products: updated, updatedAt: new Date() });
        } catch (e) { console.error('Firebase save error:', e); }
    }
    renderProductsEdit();
    showMessage(updated.length + ' ürün kaydedildi!', 'success');
}

function loadSettings() {
    const s = JSON.parse(localStorage.getItem('matrixSettings') || '{}');
    const pl = document.getElementById('paymentLink');
    const dl = document.getElementById('discordLinkInput');
    if (pl) pl.value = s.paymentLink || '';
    if (dl) dl.value = s.discordLink || '';
}

function saveSettings() {
    const s = {
        paymentLink: document.getElementById('paymentLink')?.value || '',
        discordLink: document.getElementById('discordLinkInput')?.value || ''
    };
    localStorage.setItem('matrixSettings', JSON.stringify(s));
    showMessage('Ayarlar kaydedildi!', 'success');
}

function renderRequests(requests) {
    const container = document.getElementById('ordersList');
    if (!container) return;

    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Yeni' || r.status === 'İnceleniyor').length;
    const completed = requests.filter(r => r.status === 'Tamamlandı').length;

    const summary = document.getElementById('ordersSummary');
    if (summary) {
        summary.innerHTML = `
            <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;background:rgba(0,255,65,0.03);border:1px solid var(--admin-border);border-radius:8px;">
                <span style="color:var(--admin-muted);font-size:0.8rem;">Toplam: <strong style="color:var(--admin-text);">${total}</strong></span>
                <span style="color:var(--admin-muted);font-size:0.8rem;">Bekleyen: <strong style="color:#ffc107;">${pending}</strong></span>
                <span style="color:var(--admin-muted);font-size:0.8rem;">Tamamlanan: <strong style="color:var(--admin-primary);">${completed}</strong></span>
            </div>
        `;
    }

    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Henüz sipariş talebi yok.</div></div>';
        return;
    }
    container.innerHTML = requests.map(req => {
        const date = req.createdAt ? new Date(req.createdAt.seconds ? req.createdAt.seconds * 1000 : req.createdAt).toLocaleDateString('tr-TR') : '-';
        const time = req.createdAt ? new Date(req.createdAt.seconds ? req.createdAt.seconds * 1000 : req.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
        const badgeClass = req.status === 'Tamamlandı' ? 'badge-green' : req.status === 'İptal' ? 'badge-red' : req.status === 'İnceleniyor' ? 'badge-yellow' : 'badge-blue';
        return `
        <div class="order-card">
            <div class="order-card-top">
                <span class="order-card-id">#${req.id.slice(0, 8).toUpperCase()}</span>
                <span class="order-card-date">${date} ${time}</span>
            </div>
            <div class="order-card-grid">
                <div class="order-card-field"><label>Oyun</label><span>${req.game || '-'}</span></div>
                <div class="order-card-field"><label>Paket</label><span>${req.package || '-'}</span></div>
                <div class="order-card-field"><label>Sipariş No</label><span style="color:#00ff41;">${req.orderNumber || '-'}</span></div>
                <div class="order-card-field"><label>Müşteri</label><span>${req.userEmail || '-'}</span></div>
                <div class="order-card-field"><label>Durum</label><span class="badge ${badgeClass}">${req.status || 'Yeni'}</span></div>
            </div>
            ${req.note ? `<div style="padding:10px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:10px;"><span style="color:#808080;font-size:0.75rem;">Not:</span><p style="color:#c0c0d0;margin-top:4px;font-size:0.85rem;">${req.note}</p></div>` : ''}
            <div class="order-card-actions">
                <button class="btn btn-ghost btn-xs" onclick="updateRequestStatus('${req.id}', 'İnceleniyor')">⏳ İnceleniyor</button>
                <button class="btn btn-primary btn-xs" onclick="updateRequestStatus('${req.id}', 'Tamamlandı')">✓ Tamamlandı</button>
                <button class="btn btn-danger btn-xs" onclick="updateRequestStatus('${req.id}', 'İptal')">✕ İptal</button>
            </div>
        </div>`;
    }).join('');
}

async function updateRequestStatus(id, status) {
    if (!window.firebaseReady || !window.db) { showMessage('Firebase bağlı değil!', 'error'); return; }
    try {
        await window.db.collection('support_requests').doc(id).update({ status });
        showMessage('Durum güncellendi!', 'success');
        const requests = await window.getSupportRequests();
        renderRequests(requests);
        loadAdminData();
    } catch (e) {
        showMessage('Hata: ' + e.message, 'error');
    }
}

async function loadSupportRequests() {
    if (typeof getSupportRequests !== 'function') { showMessage('Sipariş sistemi yüklenemedi!', 'error'); return; }
    try {
        const requests = await getSupportRequests();
        renderRequests(requests);
    } catch (e) {
        showMessage('Siparişler yüklenirken hata: ' + e.message, 'error');
    }
}

async function loadConfirmations() {
    if (typeof getOrderConfirmations !== 'function') { showMessage('Onay sistemi yüklenemedi! (getOrderConfirmations bulunamadı)', 'error'); return; }
    if (!window.firebaseReady) { showMessage('Firebase bağlı değil!', 'error'); return; }
    try {
        console.log('Onay talepleri yükleniyor...');
        const confirmations = await getOrderConfirmations();
        console.log('Yüklenen onay talebi sayısı:', confirmations.length);
        if (confirmations.length > 0) console.log('İlk kayıt:', confirmations[0]);
        renderConfirmations(confirmations);
    } catch (e) {
        console.error('Onaylar yüklenirken hata:', e);
        showMessage('Onaylar yüklenirken hata: ' + e.message, 'error');
    }
}

function renderConfirmations(confirmations) {
    const container = document.getElementById('confirmationsList');
    if (!container) return;

    const total = confirmations.length;
    const pending = confirmations.filter(r => r.status === 'Onay Bekliyor' || r.status === 'İnceleniyor').length;
    const approved = confirmations.filter(r => r.status === 'Onaylandı').length;

    const summary = document.getElementById('confirmationsSummary');
    if (summary) {
        summary.innerHTML = `
            <div style="display:flex;gap:15px;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;background:rgba(0,255,65,0.03);border:1px solid var(--admin-border);border-radius:8px;">
                <span style="color:var(--admin-muted);font-size:0.8rem;">Toplam: <strong style="color:var(--admin-text);">${total}</strong></span>
                <span style="color:var(--admin-muted);font-size:0.8rem;">Bekleyen: <strong style="color:#ffc107;">${pending}</strong></span>
                <span style="color:var(--admin-muted);font-size:0.8rem;">Onaylanan: <strong style="color:var(--admin-primary);">${approved}</strong></span>
            </div>
        `;
    }

    if (!confirmations || confirmations.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div class="empty-state-text">Henüz sipariş onay talebi yok.</div></div>';
        return;
    }

    container.innerHTML = confirmations.map(req => {
        const date = req.createdAt ? new Date(req.createdAt.seconds ? req.createdAt.seconds * 1000 : req.createdAt).toLocaleDateString('tr-TR') : '-';
        const time = req.createdAt ? new Date(req.createdAt.seconds ? req.createdAt.seconds * 1000 : req.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
        const badgeClass = req.status === 'Onaylandı' ? 'badge-green' : req.status === 'Reddedildi' ? 'badge-red' : req.status === 'İnceleniyor' ? 'badge-yellow' : 'badge-blue';
        return `
        <div class="order-card">
            <div class="order-card-top">
                <span class="order-card-id">#${req.id.slice(0, 8).toUpperCase()}</span>
                <span class="order-card-date">${date} ${time}</span>
            </div>
            <div class="order-card-grid">
                <div class="order-card-field"><label>Sipariş No</label><span style="color:#00ff41;">${req.orderNumber || '-'}</span></div>
                <div class="order-card-field"><label>Gmail</label><span style="color:#00ff41;">${req.gmail || '-'}</span></div>
                <div class="order-card-field"><label>E-posta</label><span>${req.userEmail || '-'}</span></div>
                <div class="order-card-field"><label>Ürün</label><span>${req.product || '-'}</span></div>
                <div class="order-card-field"><label>Durum</label><span class="badge ${badgeClass}">${req.status || 'Onay Bekliyor'}</span></div>
            </div>
            ${req.note ? `<div style="padding:10px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:10px;"><span style="color:#808080;font-size:0.75rem;">Not:</span><p style="color:#c0c0d0;margin-top:4px;font-size:0.85rem;">${req.note}</p></div>` : ''}
            <div class="order-card-actions">
                <button class="btn btn-ghost btn-xs" onclick="updateConfirmation('${req.id}', 'İnceleniyor')">⏳ İnceleniyor</button>
                <button class="btn btn-primary btn-xs" onclick="updateConfirmation('${req.id}', 'Onaylandı')">✓ Onayla</button>
                <button class="btn btn-danger btn-xs" onclick="updateConfirmation('${req.id}', 'Reddedildi')">✕ Reddet</button>
            </div>
        </div>`;
    }).join('');
}

async function updateConfirmation(id, status) {
    if (!window.firebaseReady || !window.db) { showMessage('Firebase bağlı değil!', 'error'); return; }
    try {
        await window.db.collection(window.CONFIRM_COLLECTION || 'order_confirmations').doc(id).update({ status });
        showMessage('Durum güncellendi!', 'success');
        const confirmations = await window.getOrderConfirmations();
        renderConfirmations(confirmations);
        loadAdminData();
    } catch (e) {
        showMessage('Hata: ' + e.message, 'error');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    if (!users || users.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Henüz kullanıcı yok.</div></div>';
        return;
    }
    container.innerHTML = `
        <div class="data-table-wrap">
        <table class="data-table">
            <thead><tr>
                <th>E-posta</th>
                <th>İsim</th>
                <th>Rol</th>
                <th>Kayıt</th>
                <th>İşlem</th>
            </tr></thead>
            <tbody>${users.map(u => {
                const date = u.createdAt ? new Date(u.createdAt.seconds ? u.createdAt.seconds * 1000 : u.createdAt).toLocaleDateString('tr-TR') : '-';
                return `<tr>
                    <td>${u.email || '-'}</td>
                    <td>${u.displayName || '-'}</td>
                    <td><span class="badge ${u.isAdmin ? 'badge-green' : 'badge-blue'}">${u.isAdmin ? 'Admin' : 'Kullanıcı'}</span></td>
                    <td>${date}</td>
                    <td><button class="btn btn-ghost btn-xs" onclick="toggleUserAdmin('${u.email}', ${!u.isAdmin})">${u.isAdmin ? 'Admin Kaldır' : 'Admin Yap'}</button></td>
                </tr>`;
            }).join('')}</tbody>
        </table>
        </div>`;
}

async function toggleUserAdmin(email, makeAdmin) {
    if (!window.firebaseReady || !window.db) return;
    try {
        const snap = await window.db.collection('users').where('email', '==', email).get();
        if (!snap.empty) {
            await window.db.collection('users').doc(snap.docs[0].id).update({ isAdmin: makeAdmin });
            showMessage(makeAdmin ? 'Kullanıcı admin yapıldı!' : 'Admin yetkisi kaldırıldı!', 'success');
            loadAdminData();
        }
    } catch (e) {
        showMessage('Hata: ' + e.message, 'error');
    }
}

let allShopierOrders = [];

async function loadShopierOrders(filtre = '') {
    const url = filtre ? `/api/admin/orders?durum=${filtre}` : '/api/admin/orders';
    try {
        const r = await fetch(url);
        const d = await r.json();
        if (d.durum !== 'basarili') { showMessage('Shopier siparişleri alınamadı!', 'error'); return; }
        allShopierOrders = d.siparisler;
        renderShopierOrders();
        renderShopierStats();
    } catch (e) {
        showMessage('Shopier siparişleri yüklenirken hata: ' + e.message, 'error');
    }
}

function renderShopierStats() {
    const container = document.getElementById('shopierStats');
    if (!container) return;
    const bekleyen = allShopierOrders.filter(o => o.durum === 'odeme_bekliyor').length;
    const odendi = allShopierOrders.filter(o => o.durum === 'odendi_key_bekliyor').length;
    const teslim = allShopierOrders.filter(o => o.durum === 'teslim_edildi').length;
    const toplam = allShopierOrders.length;
    const gelir = allShopierOrders.filter(o => o.durum === 'teslim_edildi').reduce((t, o) => t + (parseFloat(o.urunFiyat) || 0), 0);
    container.innerHTML = `
        <div class="stat-card"><div class="stat-card-label">Ödeme Bekliyor</div><div class="stat-card-value pending" style="font-size:1.5rem;">${bekleyen}</div></div>
        <div class="stat-card"><div class="stat-card-label">Key Bekliyor</div><div class="stat-card-value" style="font-size:1.5rem;color:#ffc107;">${odendi}</div></div>
        <div class="stat-card"><div class="stat-card-label">Teslim Edildi</div><div class="stat-card-value" style="font-size:1.5rem;color:#00ff41;">${teslim}</div></div>
        <div class="stat-card"><div class="stat-card-label">Toplam</div><div class="stat-card-value" style="font-size:1.5rem;">${toplam}</div></div>
        <div class="stat-card"><div class="stat-card-label">Toplam Gelir</div><div class="stat-card-value revenue" style="font-size:1.5rem;">₺${gelir.toLocaleString('tr-TR')}</div></div>
    `;

    const filterContainer = document.getElementById('shopierFilters');
    if (filterContainer) {
        const filters = [
            { label: 'Tümü', value: '' },
            { label: 'Ödeme Bekliyor', value: 'odeme_bekliyor' },
            { label: 'Key Bekliyor', value: 'odendi_key_bekliyor' },
            { label: 'Teslim Edildi', value: 'teslim_edildi' }
        ];
        filterContainer.innerHTML = filters.map(f =>
            `<button class="btn ${f.value === '' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="filterShopier('${f.value}')">${f.label}</button>`
        ).join('');
    }
}

function filterShopier(filtre) {
    document.querySelectorAll('#shopierFilters .btn').forEach(b => {
        b.className = 'btn btn-sm ' + (b.textContent === (filtre === '' ? 'Tümü' : (
            filtre === 'odeme_bekliyor' ? 'Ödeme Bekliyor' :
            filtre === 'odendi_key_bekliyor' ? 'Key Bekliyor' : 'Teslim Edildi'
        )) ? 'btn-primary' : 'btn-ghost');
    });
    loadShopierOrders(filtre);
}

function renderShopierOrders() {
    const tbody = document.getElementById('shopierOrdersBody');
    if (!tbody) return;
    if (!allShopierOrders.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Shopier siparişi bulunmuyor.</div></td></tr>';
        return;
    }
    tbody.innerHTML = allShopierOrders.map(o => {
        const durumText = {
            'odeme_bekliyor': 'Ödeme Bekliyor',
            'odendi_key_bekliyor': 'Ödendi - Key Bekliyor',
            'teslim_edildi': 'Teslim Edildi'
        }[o.durum] || o.durum;

        const badgeClass = {
            'odeme_bekliyor': 'badge-yellow',
            'odendi_key_bekliyor': 'badge-blue',
            'teslim_edildi': 'badge-green'
        }[o.durum] || 'badge-red';

        const islem = o.durum === 'odendi_key_bekliyor' ? `
            <div style="display:flex;gap:6px;">
                <input type="text" class="form-input form-input-sm" id="shopierKey-${o.siparisId}" placeholder="Lisans anahtarı..." style="min-width:140px;">
                <button class="btn btn-primary btn-xs" onclick="deliverShopier('${o.siparisId}')">Teslim Et</button>
            </div>
        ` : o.durum === 'teslim_edildi' ? `<span style="color:#00ffff;">✓ ${o.lisansAnahtari}</span>` : '-';

        return `<tr>
            <td style="color:#00ff41;font-family:monospace;">${o.siparisId}</td>
            <td>${o.urunAdi || '-'}${o.paket ? ' ('+o.paket+')' : ''}</td>
            <td>₺${(parseFloat(o.urunFiyat) || 0).toFixed(2)}</td>
            <td>${o.musteriAdi || ''} ${o.musteriSoyadi || ''}</td>
            <td>${o.musteriEmail || '-'}</td>
            <td>${o.odemeTarihi ? new Date(o.odemeTarihi).toLocaleDateString('tr-TR') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('tr-TR') : '-')}</td>
            <td><span class="badge ${badgeClass}">${durumText}</span></td>
            <td>${islem}</td>
        </tr>`;
    }).join('');
}

async function deliverShopier(siparisId) {
    const input = document.getElementById(`shopierKey-${siparisId}`);
    const anahtar = input?.value.trim();
    if (!anahtar) { showMessage('Lisans anahtarı girin!', 'error'); return; }
    try {
        const r = await fetch('/api/admin/deliver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siparis_id: siparisId, lisans_anahtari: anahtar })
        });
        const d = await r.json();
        if (d.durum === 'basarili') {
            showMessage('Lisans anahtarı teslim edildi!', 'success');
            loadShopierOrders();
        } else {
            showMessage(d.mesaj || 'Hata', 'error');
        }
    } catch (e) {
        showMessage('Sunucu hatası: ' + e.message, 'error');
    }
}

function showMessage(text, type) {
    const container = document.querySelector('.matrix-message-container') || (() => {
        const c = document.createElement('div');
        c.className = 'matrix-message-container';
        c.style.cssText = 'position:fixed;top:80px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:350px;';
        document.body.appendChild(c);
        return c;
    })();
    const msg = document.createElement('div');
    msg.className = `matrix-message ${type || 'info'}`;
    msg.innerHTML = `<span class="msg-content">${text}</span><button class="close-msg" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(msg);
    setTimeout(() => msg.classList.add('hiding'), 3000);
    setTimeout(() => msg.remove(), 3300);
}

document.addEventListener('DOMContentLoaded', initAdmin);