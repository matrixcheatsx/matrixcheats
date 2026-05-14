let currentProduct = null;
let selectedPackage = 'month';

async function loadProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    if (products.length === 0) {
        await loadProductsFromStorage();
    }
    
    console.log('Product ID:', productId);
    console.log('Tüm ürünler:', products);
    
    if (products.length === 0) {
        const titleEl = document.getElementById('productTitle');
        const descEl = document.getElementById('productDesc');
        if (titleEl) titleEl.textContent = 'Ürün bulunamadı';
        if (descEl) descEl.textContent = 'Henüz ürün eklenmemiş.';
        return;
    }
    
    currentProduct = products.find(p => p.id === productId);
    
    if (!currentProduct) {
        currentProduct = products[0];
    }
    
    console.log('Seçili ürün:', currentProduct);
    console.log('Resim URL:', currentProduct?.image);
    
    const mainImage = document.getElementById('productImage');
    if (mainImage && currentProduct) {
        if (currentProduct.image && currentProduct.image.trim() !== '') {
            console.log('Resim gösteriliyor:', currentProduct.image);
            mainImage.innerHTML = `<img id="detailProductImg" src="${currentProduct.image}" alt="${currentProduct.title}" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" onerror="this.style.display = 'none'; this.parentNode.innerHTML = '<div style=\'font-size: 80px; text-align: center; line-height: 200px;\'>${currentProduct.icon}</div>';">`;
        } else {
            console.log('Emoji gösteriliyor:', currentProduct.icon);
            mainImage.innerHTML = `<div style="font-size: 80px; text-align: center; line-height: 200px;">${currentProduct.icon}</div>`;
        }
    }
    
    const titleEl = document.getElementById('productTitle');
    const descEl = document.getElementById('productDesc');
    if (titleEl) titleEl.textContent = currentProduct.title;
    if (descEl) descEl.textContent = currentProduct.desc;
    
    const featuresGrid = document.getElementById('featuresGrid');
    console.log('Ürün özellikleri:', currentProduct.features);
    
    let features = currentProduct.features || [];
    
    if (features.length === 0) {
        features = [
            'Aimbot - Hassas nişan sistemi',
            'ESP - Oyuncu görünürlüğü',
            'Skin Changer - Silah görünümü değiştirme',
            'Wallhack - Duvarların arkasını görme',
            'Anti-Ban koruma sistemi'
        ];
    }
    
    if (featuresGrid) {
        const featuresHTML = features.map(f => `
            <div class="feature-item">
                <span class="feature-icon">✓</span>
                <span class="feature-text">${f}</span>
            </div>
        `).join('');
        featuresGrid.innerHTML = featuresHTML;
    }
    
    const sysReq = currentProduct.systemReq || { 
        os: 'Windows 10/11', 
        processor: 'Intel Core i5', 
        ram: '8GB', 
        gpu: 'GTX 1050', 
        storage: '500MB' 
    };
    console.log('Sistem gereksinimleri:', sysReq);
    const sysReqHTML = `
        <div class="system-req-item">
            <span class="system-req-label">İşletim Sistemi</span>
            <span class="system-req-value">${sysReq.os}</span>
        </div>
        <div class="system-req-item">
            <span class="system-req-label">İşlemci</span>
            <span class="system-req-value">${sysReq.processor}</span>
        </div>
        <div class="system-req-item">
            <span class="system-req-label">RAM</span>
            <span class="system-req-value">${sysReq.ram}</span>
        </div>
        <div class="system-req-item">
            <span class="system-req-label">Ekran Kartı</span>
            <span class="system-req-value">${sysReq.gpu}</span>
        </div>
        <div class="system-req-item">
            <span class="system-req-label">Depolama</span>
            <span class="system-req-value">${sysReq.storage}</span>
        </div>
    `;
    const systemReqGrid = document.getElementById('systemReqGrid');
    if (systemReqGrid) {
        systemReqGrid.innerHTML = sysReqHTML;
    }
    
    renderPackages();
}

function renderPackages() {
    console.log('renderPackages called, currentProduct:', currentProduct);
    const container = document.getElementById('packagesGrid');
    if (!container) {
        console.error('packagesGrid element not found!');
        return;
    }
    const prices = currentProduct && currentProduct.prices ? currentProduct.prices : { day: 49, week: 149, month: 299 };
    
    const packages = [
        { key: 'day', duration: '1 GÜN', price: prices.day || 49, label: 'Ekonomik' },
        { key: 'week', duration: '1 HAFTA', price: prices.week || 149, label: 'Popüler' },
        { key: 'month', duration: '1 AY', price: prices.month || 299, label: 'En İyi' }
    ];
    
    const html = packages.map(pkg => `
        <div class="package-card ${selectedPackage === pkg.key ? 'selected' : ''}" onclick="selectPackage('${pkg.key}')">
            <div class="package-duration">${pkg.duration}</div>
            <div class="package-price">₺${pkg.price}</div>
            <div class="package-label">${pkg.label}</div>
        </div>
    `).join('');
    
    container.innerHTML = html;
    console.log('Packages rendered, html length:', html.length);
}

function selectPackage(key) {
    selectedPackage = key;
    renderPackages();
}

async function buyProduct() {
    if (!currentProduct) {
        showMessage('Ürün bulunamadı!', 'error');
        return;
    }

    const paymentLink = currentProduct.paymentLinks?.[selectedPackage];
    if (paymentLink && paymentLink.trim() !== '') {
        window.location.href = paymentLink;
        return;
    }

    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userEmail = user?.email || user?._delegate?.email || '';

    if (!userEmail) {
        showMessage('Ödeme yapmak için giriş yapmalısınız!', 'warning');
        openAuth();
        return;
    }

    const prices = currentProduct.prices || { day: 49, week: 149, month: 299 };
    const priceMap = { day: prices.day, week: prices.week, month: prices.month };
    const fiyat = priceMap[selectedPackage] || prices.month;

    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                urun_id: currentProduct.id,
                urun_adi: currentProduct.title,
                urun_fiyat: fiyat,
                musteri_adi: user.displayName || userEmail.split('@')[0],
                musteri_soyadi: '',
                musteri_email: userEmail,
                musteri_telefon: '',
                paket: selectedPackage
            })
        });

        const result = await res.json();

        if (result.durum !== 'basarili') {
            showMessage(result.mesaj || 'Bir hata oluştu!', 'error');
            return;
        }

        showMessage('Sipariş oluşturuldu! Sipariş No: ' + result.siparis_id, 'success');

    } catch (e) {
        console.error('Sipariş hatası:', e);
        showMessage('Sunucuya bağlanılamadı!', 'error');
    }
}