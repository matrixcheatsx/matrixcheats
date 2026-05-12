// Matrix Message System

function showMessage(text, type = 'info', duration = 4000) {
    let container = document.querySelector('.matrix-message-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'matrix-message-container';
        container.setAttribute('role', 'region');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Bildirimler');
        document.body.appendChild(container);
    }
    
    const msg = document.createElement('div');
    msg.className = `matrix-message ${type}`;
    msg.setAttribute('role', 'alert');
    msg.setAttribute('tabindex', '0');
    
    const content = document.createElement('span');
    content.className = 'msg-content';
    content.textContent = text;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-msg';
    closeBtn.setAttribute('aria-label', 'Bildirimi kapat');
    closeBtn.setAttribute('type', 'button');
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => removeMessage(msg));
    
    msg.appendChild(content);
    msg.appendChild(closeBtn);
    container.appendChild(msg);
    
    msg.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') removeMessage(msg);
    });
    
    if (duration > 0) {
        const progress = document.createElement('div');
        progress.className = 'msg-progress';
        progress.style.animation = `progressBar ${duration}ms linear forwards`;
        msg.appendChild(progress);
        
        setTimeout(() => {
            removeMessage(msg);
        }, duration);
    }
    
    msg.focus();
    return msg;
}

function removeMessage(msg) {
    msg.classList.add('hiding');
    msg.addEventListener('animationend', () => msg.remove());
}

function showConfirm(title, message, onConfirm, onCancel) {
    let overlay = document.querySelector('.matrix-confirm-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    overlay = document.createElement('div');
    overlay.className = 'matrix-confirm-overlay';
    overlay.innerHTML = `
        <div class="matrix-confirm-box">
            <div class="corner-tl"></div>
            <div class="corner-tr"></div>
            <div class="corner-tl"></div>
            <div class="corner-tr"></div>
            <div class="matrix-confirm-icon">⚠️</div>
            <div class="matrix-confirm-title">${title}</div>
            <div class="matrix-confirm-message">${message}</div>
            <div class="matrix-confirm-buttons">
                <button class="matrix-confirm-btn cancel" id="confirmCancel">İPTAL</button>
                <button class="matrix-confirm-btn confirm" id="confirmOk">ONAYLA</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    
    document.getElementById('confirmOk').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('confirmCancel').onclick = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };
}

function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"&]/g, '');
}

function validateImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    try {
        const trimmed = url.trim();
        if (trimmed === '') return '';
        const parsed = new URL(trimmed);
        return ['http:', 'https:'].includes(parsed.protocol) ? trimmed : '';
    } catch {
        return '';
    }
}

let products = [];

async function loadProductsFromStorage() {
    const stored = localStorage.getItem('matrixProducts');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
                console.log('localStorage\'dan yüklendi:', products.length, 'ürün');
                syncToFirebase();
                return;
            }
        } catch (e) {
            products = [];
        }
    }
    
    if (window.firebaseReady && window.getProductsFromDB) {
        try {
            const dbProducts = await window.getProductsFromDB();
            if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
                products = dbProducts;
                localStorage.setItem('matrixProducts', JSON.stringify(products));
                console.log('Firebase\'den yüklendi:', products.length, 'ürün');
                return;
            }
        } catch (e) {
            console.log('Firebase hatası:', e);
        }
    }
    
    products = [
        {
            id: 1,
            icon: '🎯',
            image: '',
            title: 'VALORANT CHEAT',
            desc: 'En güncel ve güvenli VALORANT hile yazılımı.',
            features: ['Aimbot - Hassas nişan sistemi', 'ESP - Oyuncu görünürlüğü', 'Skin Changer', 'Wallhack', 'Anti-Ban koruma', 'Otomatik güncelleme'],
            prices: { day: 49, week: 149, month: 299 },
            systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050', storage: '500MB' }
        },
        {
            id: 2,
            icon: '🔫',
            image: '',
            title: 'CS2 CHEAT',
            desc: 'Counter-Strike 2 için en iyi hile çözümü.',
            features: ['Aimbot - Hassas nişan', 'ESP - Oyuncu görünürlüğü', 'Skin Changer', 'Radar Hack', 'Bhop Helper'],
            prices: { day: 59, week: 169, month: 349 },
            systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050', storage: '500MB' }
        },
        {
            id: 3,
            icon: '🏀',
            image: '',
            title: 'NBA 2K24 CHEAT',
            desc: 'NBA 2K24 için hile yazılımı.',
            features: ['VC Generator', 'Player Stats Editor', 'Unlock All', 'Skill Cheat'],
            prices: { day: 79, week: 199, month: 399 },
            systemReq: { os: 'Windows 10/11', processor: 'Intel Core i7', ram: '16GB', gpu: 'RTX 2060', storage: '1GB' }
        }
    ];
    localStorage.setItem('matrixProducts', JSON.stringify(products));
    console.log('Varsayılan ürünler yüklendi:', products.length);
}

async function syncToFirebase() {
    if (!window.firebaseReady || !window.db) return;
    try {
        const dbSnap = await window.getProductsFromDB();
        if (!dbSnap || dbSnap.length === 0) {
            await window.db.collection('products').doc('products_list').set({
                products: products,
                updatedAt: new Date()
            });
        }
    } catch (e) {
        console.log('Firebase sync hatası:', e);
    }
}

async function syncProductsFromFirebase() {
    const stored = localStorage.getItem('matrixProducts');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return;
        } catch (e) {}
    }
    if (!window.firebaseReady || !window.getProductsFromDB) return;
    try {
        const dbProducts = await window.getProductsFromDB();
        if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
            products = dbProducts;
            localStorage.setItem('matrixProducts', JSON.stringify(products));
            initProducts();
        }
    } catch (e) {
        console.log('Firebase sync başarısız');
    }
}

function saveProductsToStorage() {
    localStorage.setItem('matrixProducts', JSON.stringify(products));
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadProductsFromStorage();
    applySettings();
    initMatrixCanvas();
    initLoader();
    initProducts();
    initCounters();
    initSmoothScroll();
    initScrollAnimations();
    initForm();
    initActiveUsers();
    initAuth();
    checkRememberMe();
    
    setInterval(syncProductsFromFirebase, 300000);
});

let currentAuthTab = 'login';

function initAuth() {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            
            if (currentAuthTab === 'login') {
                await handleLogin(email, password);
            } else {
                await handleRegister(email, password);
            }
        });
    }
    
    // Google login button
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleGoogleLogin();
        });
    }
    
    checkCurrentUser();
}

async function checkCurrentUser() {
    if (typeof getCurrentUser === 'function') {
        const user = await getCurrentUser();
        if (user) {
            updateAuthUI(user);
        }
    }
}

function updateAuthUI(user) {
    const authBox = document.querySelector('.auth-box');
    if (authBox && user) {
        authBox.innerHTML = `
            <div class="auth-box-icon">◈</div>
            <div class="auth-box-text">
                <span class="auth-box-title">${user.displayName || user.email || 'HESAP'}</span>
                <span class="auth-box-subtitle">/ MENU</span>
            </div>
        `;
        authBox.onclick = openProfileModal;
    }
    const confirmBox = document.querySelector('.order-confirm-box');
    if (confirmBox) {
        confirmBox.style.display = user ? 'flex' : 'none';
    }
}

function openProfileModal() {
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    const userEmail = user && (user.email || (user._delegate && user._delegate.email));
    
    if (!userEmail) {
        openAuth();
        return;
    }
    
    document.getElementById('profileEmail').textContent = userEmail;
    
    const isAdmin = user.isAdmin === true;
    
    document.getElementById('adminMenuItem').style.display = isAdmin ? 'flex' : 'none';
    
    document.getElementById('profileModal').classList.add('active');
}

function handleAccountClick() {
    if (window.auth && window.auth.currentUser) {
        openProfileModal();
        return;
    }
    
    const storedUser = localStorage.getItem('matrixUser');
    
    if (!storedUser) {
        openAuth();
        return;
    }
    
    try {
        const user = JSON.parse(storedUser);
        const email = user.email || (user._delegate && user._delegate.email);
        
        if (email) {
            openProfileModal();
        } else {
            openAuth();
        }
    } catch (e) {
        openAuth();
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

function openSupportModal() {
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    const userUid = user?.uid || user?._delegate?.uid || user?.user?.uid;
    
    if (!user || !userUid) {
        showMessage('Önce giriş yapmalısınız!', 'warning');
        openAuth();
        return;
    }
    
    document.getElementById('supportModal').classList.add('active');
}

function closeSupportModal() {
    document.getElementById('supportModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const storedUser = localStorage.getItem('matrixUser');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const userUid = user?.uid || user?._delegate?.uid || user?.user?.uid;
            const userEmail = user?.email || user?._delegate?.email || user?.user?.email;
            
            if (!userUid) {
                showMessage('Önce giriş yapmalısınız!', 'warning');
                return;
            }
            
            const orderNumber = document.getElementById('supportOrderNumber').value;
            
            if (!orderNumber || orderNumber.length < 5 || orderNumber.length > 15) {
                showMessage('Sipariş numarası 5-15 rakam arası olmalıdır!', 'warning');
                return;
            }
            
            if (!/^\d+$/.test(orderNumber)) {
                showMessage('Sipariş numarası sadece rakamlardan oluşmalıdır!', 'warning');
                return;
            }
            
            const supportData = {
                userId: userUid,
                userEmail: userEmail,
                game: sanitizeInput(document.getElementById('supportGame').value),
                package: sanitizeInput(document.getElementById('supportPackage').value),
                orderNumber: orderNumber,
                note: sanitizeInput(document.getElementById('supportNote').value)
            };
            
            if (typeof createSupportRequest === 'function') {
                const result = await createSupportRequest(supportData);
                if (result.success) {
                    showMessage('Talebiniz gönderildi! En kısa sürede size ulaşacağız.', 'success');
                    closeSupportModal();
                    document.getElementById('supportForm').reset();
                } else {
                    showMessage('Hata: ' + result.error, 'error');
                }
            }
        });
    }
});

function openAdminFromProfile() {
    closeProfileModal();
    window.location.href = 'pages/admin.html';
}

async function handleLogin(email, password) {
    const btn = document.querySelector('#authForm button[type="submit"]');
    btn.textContent = 'Giriş yapılıyor...';
    btn.disabled = true;
    
    console.log('Login attempt:', email);
    
    if (!window.firebaseReady) {
        showMessage('Firebase bağlantısı yok! Sayfayı yenileyip tekrar dene.', 'error');
        btn.textContent = 'GİRİŞ YAP';
        btn.disabled = false;
        return;
    }
    
    if (typeof loginUser !== 'function') {
        showMessage('Sistem hatası: Login fonksiyonu bulunamadı!', 'error');
        btn.textContent = 'GİRİŞ YAP';
        btn.disabled = false;
        return;
    }
    
    const result = await loginUser(email, password);
    
    if (result.success) {
        const user = await getCurrentUser();
        
        user.isAdmin = user.isAdmin || false;
        localStorage.setItem('matrixUser', JSON.stringify(user));
        
        updateAuthUI(user);
        closeAuth();
        showMessage('Giriş başarılı!', 'success');
        saveRememberMe();
    } else {
        showMessage('Giriş başarısız: ' + result.error, 'error');
    }
    
    btn.textContent = 'GIRIS YAP';
    btn.disabled = false;
}

function validatePassword(password) {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const errors = [];
    if (password.length < minLength) errors.push(`${minLength}+ karakter`);
    if (!hasUpper) errors.push('büyük harf');
    if (!hasLower) errors.push('küçük harf');
    if (!hasNumber) errors.push('rakam');
    if (!hasSpecial) errors.push('özel karakter');
    
    if (errors.length > 0) {
        return { valid: false, message: 'Şifre: ' + errors.join(', ') + ' içermeli' };
    }
    return { valid: true };
}

function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

async function handleRegister(email, password) {
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
        showMessage(passwordCheck.message, 'error');
        return;
    }
    
    const btn = document.querySelector('#authForm button[type="submit"]');
    btn.textContent = 'Kayıt yapılıyor...';
    btn.disabled = true;
    
    console.log('Register attempt:', email);
    
    if (!window.firebaseReady) {
        showMessage('Firebase bağlantısı yok! Sayfayı yenileyip tekrar dene.', 'error');
        btn.textContent = 'KAYIT OL';
        btn.disabled = false;
        return;
    }
    
    if (typeof createUser !== 'function') {
        showMessage('Sistem hatası: Kayıt fonksiyonu bulunamadı!', 'error');
        btn.textContent = 'KAYIT OL';
        btn.disabled = false;
        return;
    }
    
    const result = await createUser(email, password, {
        displayName: sanitizeInput(email.split('@')[0]),
        isAdmin: false,
        orders: []
    });
    
    if (result.success) {
        const user = await getCurrentUser();
        updateAuthUI(user);
        closeAuth();
        showMessage('Kayıt başarılı!', 'success');
        saveRememberMe();
    } else {
        showMessage('Kayıt başarısız: ' + result.error, 'error');
    }
    
    btn.textContent = 'KAYIT OL';
    btn.disabled = false;
}

async function handleLogout() {
    await logoutUser();
    const authBox = document.querySelector('.auth-box');
    if (authBox) {
        authBox.innerHTML = `
            <div class="auth-box-icon">◈</div>
            <div class="auth-box-text">
                <span class="auth-box-title">GİRİŞ</span>
                <span class="auth-box-subtitle">/ KAYIT</span>
            </div>
        `;
        authBox.onclick = openAuth;
    }
    const confirmBox = document.querySelector('.order-confirm-box');
    if (confirmBox) confirmBox.style.display = 'none';
    showMessage('Çıkış yapıldı.', 'info');
}

async function handleGoogleLogin() {
    if (!window.firebaseReady) {
        showMessage('Firebase bağlantısı yok!', 'error');
        return;
    }
    
    if (typeof loginWithGoogle !== 'function') {
        showMessage('Google giriş sistemi bulunamadı!', 'error');
        return;
    }
    
    const result = await loginWithGoogle();
    
    if (result.success) {
        const user = await getCurrentUser();
        localStorage.setItem('matrixUser', JSON.stringify(user));
        
        updateAuthUI(user);
        closeAuth();
        showMessage('Google ile giriş başarılı!', 'success');
        saveRememberMe();
    } else {
        showMessage('Google giriş başarısız: ' + result.error, 'error');
    }
}

function showForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    document.getElementById('authForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    document.getElementById('authOptions').style.display = 'none';
}

function showLoginForm(e) {
    if (e && e.preventDefault) e.preventDefault();
    document.getElementById('authForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('authOptions').style.display = 'flex';
}

async function handleForgotPassword() {
    const email = document.getElementById('resetEmail').value;
    if (!email) {
        showMessage('Lütfen e-posta adresinizi girin!', 'warning');
        return;
    }
    
    if (!window.firebaseReady) {
        showMessage('Firebase bağlantısı yok!', 'error');
        return;
    }
    
    const result = await resetPassword(email);
    
if (result.success) {
        showMessage('Şifre sıfırlama linki e-posta adresinize gönderildi!', 'success');
        showLoginForm();
    } else {
        showMessage('Hata: ' + result.error, 'error');
    }
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('registerTab').classList.toggle('active', tab === 'register');
    document.getElementById('authSubmitBtn').textContent = tab === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL';
    
    // Show/hide forgot password based on tab
    const authOptions = document.getElementById('authOptions');
    if (authOptions) {
        authOptions.style.display = tab === 'login' ? 'flex' : 'none';
    }
    
    // Reset forms
    document.getElementById('authForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
}

// Handle remember me checkbox
function saveRememberMe() {
    const rememberMe = document.getElementById('rememberMe')?.checked;
    if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
    } else {
        localStorage.removeItem('rememberMe');
    }
}

// Check if user should stay logged in
async function checkRememberMe() {
    const rememberMe = localStorage.getItem('rememberMe');
    if (rememberMe === 'true' && window.firebaseReady) {
        const user = await getCurrentUser();
        if (user) {
            updateAuthUI(user);
        }
    }
}

function initActiveUsers() {
    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) {
        activeUsersEl.textContent = Math.floor(Math.random() * 101);
        setInterval(() => {
            activeUsersEl.textContent = Math.floor(Math.random() * 85 + 15);
        }, 45000);
    }
}

function initProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:50px;color:#808080;font-family:\'Share Tech Mono\',monospace;"><p style="font-size:1.2rem;margin-bottom:10px;">◈</p><p>Henüz ürün eklenmemiş.</p></div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const featuresHTML = product.features.map(f => `<li>${f}</li>`).join('');
        
        let imageHTML = '';
        if (product.image && product.image.trim() !== '') {
            const validUrl = validateImageUrl(product.image);
            if (validUrl) {
                imageHTML = `<div class="product-image"><img src="${validUrl}" alt="${sanitizeInput(product.title)}" loading="lazy" onerror="this.style.display='none';this.parentNode.innerHTML='<div class=product-icon>${product.icon}</div>'"></div>`;
            }
        }
        if (!imageHTML) {
            imageHTML = `<div class="product-icon">${product.icon}</div>`;
        }
        
        const cheapestPrice = Math.min(product.prices.day, product.prices.week, product.prices.month);
        const cheapestLabel = product.prices.day === cheapestPrice ? '/gün' : product.prices.week === cheapestPrice ? '/hafta' : '/ay';
        
        card.innerHTML = `
            ${imageHTML}
            <h3 class="product-title">${product.title}</h3>
            <p class="product-desc">${product.desc}</p>
            <div class="product-price">₺${cheapestPrice}<span>${cheapestLabel} en ucuz</span></div>
            <button class="btn-product" onclick="viewProduct(${product.id})">DETAYLI İNCELE</button>
        `;
        
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
}

function initMatrixCanvas() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animFrameId;
    let w, h, cols, drops;
    const chars = '01';
    const gap = 14;
    
    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        cols = Math.ceil(w / gap);
        drops = [];
        for (let i = 0; i < cols; i++) drops[i] = Math.random() * h;
    }
    
    resize();
    
    let lastTime = 0;
    const interval = 50;
    
    function draw(timestamp) {
        if (timestamp - lastTime < interval) {
            animFrameId = requestAnimationFrame(draw);
            return;
        }
        lastTime = timestamp;
        
        ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        ctx.fillRect(0, 0, w, h);
        
        ctx.font = '14px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const y = drops[i] * 14;
            const useRed = Math.random() > 0.5;
            ctx.fillStyle = useRed
                ? `rgba(255, 10, 10, ${0.3 + Math.random() * 0.4})`
                : `rgba(0, 255, 65, ${0.3 + Math.random() * 0.4})`;
            ctx.fillText(chars[Math.floor(Math.random() * 2)], i * gap, y);
            
            if (y > h && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
        
        animFrameId = requestAnimationFrame(draw);
    }
    
    animFrameId = requestAnimationFrame(draw);
    
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resize, 100);
    }, { passive: true });
}

function initLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(function() {
            loader.classList.add('hidden');
        }, 1800);
    }
}

function initCounters() {
    const counters = document.querySelectorAll('.stat-number:not(#activeUsers)');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const counter = entry.target;
                const target = counter.dataset.count ? parseInt(counter.dataset.count) : parseInt(counter.textContent);
                if (!isNaN(target)) {
                    animateCounter(counter, target);
                }
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element, target) {
    let count = 0;
    const increment = target / 50;
    const stepTime = 40;
    const timer = setInterval(() => {
        count += increment;
        if(count >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(count);
        }
    }, stepTime);
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('http')) {
                const target = document.querySelector(href);
                if(target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const nav = document.querySelector('.nav');
                if (nav && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    document.querySelector('.mobile-toggle')?.classList.remove('active');
                }
            }
        });
    });
    
    let ticking = false;
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                let current = '';
                const scrollY = window.scrollY;
                sections.forEach(section => {
                    if (scrollY >= section.offsetTop - 200) {
                        current = section.getAttribute('id');
                    }
                });
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    const animEls = document.querySelectorAll(
        '.fade-in, .fade-in-up, .fade-in-left, .fade-in-right, .scale-in, ' +
        '.product-card, .about-feature, .contact-item, .pricing-card, .section-header'
    );
    animEls.forEach(el => observer.observe(el));
}

function initForm() {
    const contactForm = document.getElementById('contactForm');
    if(contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            showMessage('Mesajınız gönderildi!', 'success');
            contactForm.reset();
        });
    }
}

function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.mobile-toggle');
    if (nav) {
        nav.classList.toggle('active');
    }
    if (toggle) {
        toggle.classList.toggle('active');
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
    }
}

function openAuth() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('active');
}

function viewProduct(productId) {
    window.location.href = `pages/product.html?id=${productId}`;
}

async function openAdminPanel() {
    window.location.href = 'pages/admin.html';
}

function applySettings() {
    const settings = JSON.parse(localStorage.getItem('matrixSettings') || '{}');
    const discordEl = document.getElementById('discordLink');
    const supportEl = document.getElementById('supportLink');
    
    if (discordEl && settings.discordLink) {
        discordEl.href = settings.discordLink;
    }
    if (supportEl && settings.supportLink) {
        supportEl.href = settings.supportLink;
    }
}

function openOrderConfirmModal() {
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (!user || !user.email) {
        showMessage('Önce giriş yapmalısınız!', 'warning');
        openAuth();
        return;
    }
    
    const sel = document.getElementById('confirmProduct');
    if (sel) {
        sel.innerHTML = '<option value="">Ürün Seçin</option>';
        loadProductsFromStorage();
        (products || []).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.title;
            opt.textContent = p.icon + ' ' + p.title;
            sel.appendChild(opt);
        });
        const other = document.createElement('option');
        other.value = 'Diğer';
        other.textContent = 'Diğer';
        sel.appendChild(other);
    }
    
    document.getElementById('orderConfirmModal').classList.add('active');
}

function closeOrderConfirmModal() {
    document.getElementById('orderConfirmModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    const confirmForm = document.getElementById('orderConfirmForm');
    if (confirmForm) {
        confirmForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const storedUser = localStorage.getItem('matrixUser');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const userEmail = user?.email || user?._delegate?.email || user?.user?.email;
            const userUid = user?.uid || user?._delegate?.uid || user?.user?.uid;
            
            if (!userEmail) {
                showMessage('Önce giriş yapmalısınız!', 'warning');
                return;
            }
            
            const orderNumber = document.getElementById('confirmOrderNumber').value.trim();
            const gmail = document.getElementById('confirmGmail').value.trim();
            const product = document.getElementById('confirmProduct').value;
            const note = document.getElementById('confirmNote').value.trim();
            
            if (!orderNumber) {
                showMessage('Sipariş numarası girin!', 'warning');
                return;
            }
            
            if (!gmail) {
                showMessage('Gmail adresinizi girin!', 'warning');
                return;
            }
            
            if (!product) {
                showMessage('Ürün seçin!', 'warning');
                return;
            }
            
            const confirmData = {
                userId: userUid || '',
                userEmail: userEmail,
                gmail: sanitizeInput(gmail),
                orderNumber: sanitizeInput(orderNumber),
                product: sanitizeInput(product),
                note: sanitizeInput(note)
            };
            
            if (typeof createOrderConfirmation === 'function') {
                const result = await createOrderConfirmation(confirmData);
                if (result.success) {
                    showMessage('Sipariş onay talebiniz alındı! Admin onayından sonra aktif edilecektir.', 'success');
                    closeOrderConfirmModal();
                    document.getElementById('orderConfirmForm').reset();
                } else {
                    showMessage('Hata: ' + result.error, 'error');
                }
            }
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAuth();
        closeProfileModal();
        closeOrderConfirmModal();
    }
});

window.addEventListener('click', function(e) {
    if (e.target.id === 'authModal') closeAuth();
    if (e.target.id === 'orderConfirmModal') closeOrderConfirmModal();
});

