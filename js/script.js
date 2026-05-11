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
    console.log('loadProductsFromStorage - başladı');
    
    if (window.firebaseReady && window.getProductsFromDB) {
        console.log('Firebase\'den ürünler çekiliyor...');
        try {
            const dbProducts = await window.getProductsFromDB();
            console.log('Firebase ürünleri:', dbProducts);
            if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
                products = dbProducts;
                localStorage.setItem('matrixProducts', JSON.stringify(products));
                console.log('Firebase\'den yüklendi:', products.length, 'ürün');
                return;
            }
            console.log('Firebase\'de ürün yok veya boş array');
        } catch (e) {
            console.log('Firebase hatası:', e);
        }
    } else {
        console.log('Firebase hazır değil veya getProductsFromDB yok');
    }
    
    const stored = localStorage.getItem('matrixProducts');
    console.log('localStorage products:', stored);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                products = parsed;
                console.log('localStorage\'dan yüklendi:', products.length, 'ürün');
                return;
            }
        } catch (e) {
            products = [];
        }
    }
    products = [];
    console.log('Son ürünler:', products);
}

async function syncProductsFromFirebase() {
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
    openAdminPanel();
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
            activeUsersEl.textContent = Math.floor(Math.random() * 101);
        }, 35000);
    }
}

function initProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    console.log('initProducts - ürün sayısı:', products.length);
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:50px;color:#808080;font-family:\'Share Tech Mono\',monospace;"><p style="font-size:1.2rem;margin-bottom:10px;">◈</p><p>Henüz ürün eklenmemiş.</p></div>';
        return;
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const featuresHTML = product.features.map(f => `<li>${f}</li>`).join('');
        
        let imageHTML = '';
        if (product.image && product.image.trim() !== '') {
            const validUrl = validateImageUrl(product.image);
            if (validUrl) {
                imageHTML = `<div class="product-image"><img src="${validUrl}" alt="${sanitizeInput(product.title)}" onerror="this.style.display='none';"></div>`;
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
            <ul class="product-features">${featuresHTML}</ul>
            <div class="product-price">₺${cheapestPrice}<span>${cheapestLabel} en ucuz</span></div>
            <button class="btn-product" onclick="viewProduct(${product.id})">DETAYLI İNCELE</button>
        `;
        
        grid.appendChild(card);
    });
}

function initMatrixCanvas() {
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    for(let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height;
    }
    
    function drawMatrix() {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff41';
        ctx.font = fontSize + 'px monospace';
        
        for(let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const y = drops[i] * fontSize;
            const isGreen = Math.random() > 0.7;
            const color = isGreen ? `rgba(0, 255, 65, ${Math.random() * 0.5 + 0.5})` : `rgba(255, 0, 0, ${Math.random() * 0.5 + 0.5})`;
            ctx.fillStyle = color;
            ctx.fillText(char, i * fontSize, y);
            
            if(y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(drawMatrix, 50);
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function initLoader() {
    const loader = document.getElementById('loader');
    const loaderCanvas = document.getElementById('loaderCanvas');
    
    if (loaderCanvas) {
        const ctx = loaderCanvas.getContext('2d');
        loaderCanvas.width = window.innerWidth;
        loaderCanvas.height = window.innerHeight;
        
        const chars = 'MATRIX0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*';
        const fontSize = 14;
        const columns = loaderCanvas.width / fontSize;
        const drops = [];
        
        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * loaderCanvas.height;
        }
        
        function drawMatrix() {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, loaderCanvas.width, loaderCanvas.height);
            
            ctx.fillStyle = '#00ff41';
            ctx.font = fontSize + 'px monospace';
            
            for (let i = 0; i < drops.length; i++) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                const y = drops[i] * fontSize;
                const isRed = Math.random() > 0.85;
                ctx.fillStyle = isRed ? '#ff0040' : '#00ff41';
                ctx.fillText(char, i * fontSize, y);
                
                if (y > loaderCanvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }
        
        const matrixInterval = setInterval(drawMatrix, 50);
        
        window.addEventListener('resize', function() {
            loaderCanvas.width = window.innerWidth;
            loaderCanvas.height = window.innerHeight;
        });
        
        if (loader) {
            setTimeout(function() {
                clearInterval(matrixInterval);
                loader.classList.add('hidden');
            }, 2000);
        }
    } else if (loader) {
        setTimeout(function() {
            loader.classList.add('hidden');
        }, 2000);
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
            }
        });
    });
    
    window.addEventListener('scroll', () => {
        let current = '';
        document.querySelectorAll('section').forEach(section => {
            if(window.scrollY >= section.offsetTop - 200) {
                current = section.getAttribute('id');
            }
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if(link.getAttribute('href') === '#' + current) link.classList.add('active');
        });
    });
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.fade-in, .fade-in-up, .fade-in-left, .fade-in-right, .scale-in').forEach(el => {
        observer.observe(el);
    });
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
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (!user) {
        showMessage('Admin girişi için önce giriş yapmalısınız!', 'warning');
        openAuth();
        return;
    }
    
    const userEmail = user.email || (user._delegate && user._delegate.email);
    const userUid = user.uid || (user._delegate && user._delegate.uid);
    
    if (!userEmail || !userUid) {
        showMessage('Admin girişi için önce giriş yapmalısınız!', 'warning');
        openAuth();
        return;
    }
    
    const isAdminByEmail = ADMIN_EMAILS.includes(userEmail.toLowerCase());
    
    if (!isAdminByEmail) {
        const hasAdminFlag = user.isAdmin === true;
        if (!hasAdminFlag) {
            showMessage('Bu sayfaya erişim yetkiniz yok!', 'error');
            return;
        }
        const isVerifiedAdmin = await verifyAdminStatus(userUid);
        if (!isVerifiedAdmin) {
            showMessage('Bu sayfaya erişim yetkiniz yok!', 'error');
            return;
        }
    }
    
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('profileModal').style.display = 'none';
    
    loadProductsFromStorage();
    renderAdminProducts();
    renderAdminOrders();
    document.getElementById('adminPanel').style.display = 'block';
    showAdminTab('products');
}

function closeAdminPanel() {
    document.getElementById('adminPanel').style.display = 'none';
    
    // Auth modal'ı kapat
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.remove('active');
    }
    
    // AuthBox onclick yeniden kontrol et
    const storedUser = localStorage.getItem('matrixUser');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        updateAuthUI(user);
    }
}

function showAdminTab(tab) {
    document.getElementById('adminProductsTab').style.display = tab === 'products' ? 'block' : 'none';
    document.getElementById('adminSupportTab').style.display = tab === 'support' ? 'block' : 'none';
    document.getElementById('adminSettingsTab').style.display = tab === 'settings' ? 'block' : 'none';
    document.getElementById('btnProducts').style.background = tab === 'products' ? '#00ff41' : 'transparent';
    document.getElementById('btnProducts').style.color = tab === 'products' ? '#050505' : '#00ff41';
    document.getElementById('btnSupport').style.background = tab === 'support' ? '#00ff41' : 'transparent';
    document.getElementById('btnSupport').style.color = tab === 'support' ? '#050505' : '#00ff41';
    document.getElementById('btnSettings').style.background = tab === 'settings' ? '#00ff41' : 'transparent';
    document.getElementById('btnSettings').style.color = tab === 'settings' ? '#050505' : '#00ff41';
    if (tab === 'settings') loadSettings();
    if (tab === 'support') loadSupportRequests();
}

async function loadSupportRequests() {
    console.log('loadSupportRequests çalıştı');
    const container = document.getElementById('adminSupportList');
    if (!container) {
        return;
    }
    
    if (typeof getSupportRequests !== 'function') {
        console.log('getSupportRequests fonksiyonu yok:', typeof getSupportRequests);
        container.innerHTML = '<p style="color:#ff0040;">Sipariş talepleri yüklenemedi!</p>';
        return;
    }
    
    console.log('getSupportRequests çağrılıyor...');
    const requests = await getSupportRequests();
    
    if (requests.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#808080;">Henüz sipariş talebi bulunmuyor.</div>';
        return;
    }
    
    container.innerHTML = requests.map(req => {
        const statusColor = req.status === 'Yeni' ? '#ff0040' : req.status === 'İnceleniyor' ? '#ffc107' : '#00ff41';
        const date = req.createdAt ? new Date(req.createdAt).toLocaleDateString('tr-TR') : '-';
        
        return `
            <div style="background:rgba(255,0,64,0.1);border:1px solid #ff0040;padding:20px;margin-bottom:15px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <span style="color:#ff0040;font-family:'Orbitron',sans-serif;">${req.game || 'Oyun'}</span>
                    <span style="color:${statusColor};font-weight:bold;">${req.status}</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;font-size:0.9rem;color:#ccc;">
                    <div><span style="color:#808080;">Paket:</span> ${req.package || '-'}</div>
                    <div><span style="color:#808080;">Sipariş No:</span> <span style="color:#00ff41;">${req.orderNumber || '-'}</span></div>
                    <div><span style="color:#808080;">Tarih:</span> ${date}</div>
                </div>
                <div style="margin-top:10px;font-size:0.85rem;color:#808080;">
                    <span style="color:#808080;">Email:</span> ${req.userEmail || '-'}
                </div>
                ${req.note ? `<div style="margin-top:10px;font-size:0.85rem;color:#aaa;"><span style="color:#808080;">Not:</span> ${req.note}</div>` : ''}
                <div style="margin-top:15px;display:flex;gap:10px;">
                    <button onclick="updateSupportStatus('${req.id}', 'İnceleniyor')" style="background:#ffc107;border:none;color:#000;padding:8px 15px;cursor:pointer;border-radius:4px;font-size:0.8rem;">İnceleniyor</button>
                    <button onclick="updateSupportStatus('${req.id}', 'Tamamlandı')" style="background:#00ff41;border:none;color:#000;padding:8px 15px;cursor:pointer;border-radius:4px;font-size:0.8rem;">Tamamlandı</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('matrixSettings') || '{}');
    const paymentLinkEl = document.getElementById('paymentLink');
    const supportLinkEl = document.getElementById('supportLink');
    const discordLinkEl = document.getElementById('discordLinkInput');
    
    if (paymentLinkEl) paymentLinkEl.value = settings.paymentLink || '';
    if (supportLinkEl) supportLinkEl.value = settings.supportLink || '';
    if (discordLinkEl) discordLinkEl.value = settings.discordLink || '';
}

function saveSettings() {
    const settings = {
        paymentLink: document.getElementById('paymentLink')?.value || '',
        supportLink: document.getElementById('supportLink')?.value || '',
        discordLink: document.getElementById('discordLinkInput')?.value || ''
    };
    localStorage.setItem('matrixSettings', JSON.stringify(settings));
    applySettings();
    showMessage('Ayarlar kaydedildi!', 'success');
}

async function manageUserRole() {
    const email = document.getElementById('adminUserEmail')?.value || '';
    const isAdmin = document.getElementById('adminRoleSelect')?.value === 'admin';
    
    if (!email) {
        showMessage('Lütfen bir e-posta adresi girin!', 'warning');
        return;
    }
    
    if (typeof setUserAdmin === 'function') {
        const result = await setUserAdmin(email, isAdmin);
        if (result.success) {
            showMessage(isAdmin ? 'Kullanıcı admin yapıldı!' : 'Kullanıcının admin yetkisi kaldırıldı!', 'success');
        } else {
            showMessage('Hata: ' + result.error, 'error');
        }
    } else {
        showMessage('Firebase bağlantısı yok!', 'error');
    }
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

function renderAdminOrders() {
    const orders = [
        { id: 'ORD-001', product: 'VALORANT CHEAT', duration: '1 Ay', price: 299, status: 'Beklemede', date: '08.05.2026', customer: 'test@email.com' },
        { id: 'ORD-002', product: 'CS2 CHEAT', duration: '1 Hafta', price: 179, status: 'Tamamlandı', date: '07.05.2026', customer: 'user@email.com' }
    ];
    const container = document.getElementById('adminOrdersList');
    if (container) {
        container.innerHTML = orders.map(o => `
            <div style="background:transparent;border:1px solid #1a1a1a;padding:20px;margin-bottom:15px;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                    <span style="color:#00ff41;font-family:'Orbitron',sans-serif;">${o.id}</span>
                    <span style="color:${o.status==='Tamamlandı'?'#00ff41':'#ffc107'}">${o.status}</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;font-size:0.9rem;">
                    <div><span style="color:#808080">Ürün:</span> ${o.product}</div>
                    <div><span style="color:#808080">Paket:</span> ${o.duration}</div>
                    <div><span style="color:#808080">Fiyat:</span> ₺${o.price}</div>
                    <div><span style="color:#808080">Tarih:</span> ${o.date}</div>
                </div>
            </div>
        `).join('');
    }
}

function renderAdminProducts() {
    const container = document.getElementById('adminProductsList');
    if (!container) {
        console.log('adminProductsList container not found');
        return;
    }
    
    console.log('renderAdminProducts - products:', products);
    
    if (products.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#808080;">Ürün yok. "Yeni Ürün" butonuna tıklayarak ekleyin.</div>';
        return;
    }
    
    const paymentLinks = p => p.paymentLinks || { day: '', week: '', month: '' };
    container.innerHTML = products.map(p => `
        <div style="background:transparent;border:1px solid #00ff41;padding:20px;margin-bottom:20px;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
                <span style="color:#00ff41;font-family:'Orbitron',sans-serif;">${p.icon || '🎮'} ${p.title}</span>
                <button onclick="deleteProduct(${p.id})" style="background:#ff5252;border:none;color:white;padding:8px 15px;cursor:pointer;border-radius:4px;">Sil</button>
            </div>
            <div style="margin-bottom:10px;">
                <input type="text" id="title_${p.id}" value="${p.title}" placeholder="Ürün Adı" style="width:100%;padding:8px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;">
            </div>
            <input type="text" id="image_${p.id}" value="${p.image || ''}" placeholder="🖼️ Resim URL (opsiyonel)" style="width:100%;padding:8px;margin-bottom:10px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;">
            <textarea id="desc_${p.id}" style="width:100%;padding:8px;margin-bottom:10px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;min-height:50px;">${p.desc || ''}</textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
                <input type="number" id="price_day_${p.id}" value="${p.prices?.day || 0}" placeholder="1 Gün - Fiyat" style="padding:8px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;">
                <input type="number" id="price_week_${p.id}" value="${p.prices?.week || 0}" placeholder="1 Hafta - Fiyat" style="padding:8px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;">
                <input type="number" id="price_month_${p.id}" value="${p.prices?.month || 0}" placeholder="1 Ay - Fiyat" style="padding:8px;background:#050505;border:1px solid #1a1a1a;color:#e0e0e0;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                <input type="text" id="payment_day_${p.id}" value="${paymentLinks(p).day}" placeholder="1 Gün - Ödeme Linki" style="padding:8px;background:#050505;border:1px solid #ff0040;color:#ff0040;">
                <input type="text" id="payment_week_${p.id}" value="${paymentLinks(p).week}" placeholder="1 Hafta - Ödeme Linki" style="padding:8px;background:#050505;border:1px solid #ff0040;color:#ff0040;">
                <input type="text" id="payment_month_${p.id}" value="${paymentLinks(p).month}" placeholder="1 Ay - Ödeme Linki" style="padding:8px;background:#050505;border:1px solid #ff0040;color:#ff0040;">
            </div>
        </div>
    `).join('');
}

function addProduct() {
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    products.push({
        id: newId,
        icon: '🎮',
        image: '',
        title: 'YENİ ÜRÜN',
        desc: 'Ürün açıklaması',
        features: ['Özellik'],
        prices: { day: 99, week: 249, month: 399 },
        systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050' }
    });
    renderAdminProducts();
}

function deleteProduct(id) {
    showConfirm('ÜRÜN SİL', 'Bu ürünü silmek istediğinize emin misiniz?', () => {
        products = products.filter(p => p.id !== id);
        saveProductsToStorage();
        renderAdminProducts();
        initProducts();
        showMessage('Ürün silindi!', 'success');
    });
}

async function saveProductInputs() {
    products = products.map(p => ({
        ...p,
        title: sanitizeInput(document.getElementById('title_' + p.id)?.value || p.title),
        image: validateImageUrl(document.getElementById('image_' + p.id)?.value || p.image || ''),
        desc: sanitizeInput(document.getElementById('desc_' + p.id)?.value || p.desc),
        prices: {
            day: parseInt(document.getElementById('price_day_' + p.id)?.value) || p.prices.day,
            week: parseInt(document.getElementById('price_week_' + p.id)?.value) || p.prices.week,
            month: parseInt(document.getElementById('price_month_' + p.id)?.value) || p.prices.month
        },
        paymentLinks: {
            day: document.getElementById('payment_day_' + p.id)?.value || '',
            week: document.getElementById('payment_week_' + p.id)?.value || '',
            month: document.getElementById('payment_month_' + p.id)?.value || ''
        },
        systemReq: p.systemReq || { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050' }
    }));
    
    saveProductsToStorage();
    
    if (window.firebaseReady && window.db) {
        await window.db.collection('products').doc('products_list').set({
            products: products,
            updatedAt: new Date()
        });
    }
    
    initProducts();
    renderAdminProducts();
    showMessage('Ürünler kaydedildi!', 'success');
}

document.addEventListener('keydown', function(e) {
    if(e.key === 'Escape') {
        closeAdminPanel();
        closeAuth();
    }
});

window.addEventListener('click', function(e) {
    if(e.target.id === 'authModal') closeAuth();
});

function addNewProduct() {
    const newProduct = {
        id: products.length + 1,
        icon: '🎮',
        image: '',
        title: 'Yeni Ürün',
        desc: 'Ürün açıklaması',
        features: ['Özellik 1', 'Özellik 2'],
        prices: { day: 49, week: 149, month: 299 },
        systemReq: { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050' }
    };
    products.push(newProduct);
    renderAdminProducts();
}

async function saveAllProducts() {
    console.log('saveAllProducts - başladı, products:', products);
    console.log('firebaseReady:', window.firebaseReady, 'db:', !!window.db);
    
    const updatedProducts = [];
    
    for (const p of products) {
        const titleEl = document.getElementById('title_' + p.id);
        const descEl = document.getElementById('desc_' + p.id);
        const imgEl = document.getElementById('image_' + p.id);
        const dayEl = document.getElementById('price_day_' + p.id);
        const weekEl = document.getElementById('price_week_' + p.id);
        const monthEl = document.getElementById('price_month_' + p.id);
        const payDayEl = document.getElementById('payment_day_' + p.id);
        const payWeekEl = document.getElementById('payment_week_' + p.id);
        const payMonthEl = document.getElementById('payment_month_' + p.id);
        
        if (!titleEl) {
            console.warn('title input not found for product:', p.id);
        }
        
        updatedProducts.push({
            id: p.id,
            icon: p.icon || '🎮',
            title: titleEl ? titleEl.value : (p.title || 'Yeni Ürün'),
            image: validateImageUrl(imgEl?.value || p.image || ''),
            desc: descEl ? descEl.value : (p.desc || ''),
            features: p.features || [],
            prices: {
                day: parseInt(dayEl?.value) || p.prices?.day || 0,
                week: parseInt(weekEl?.value) || p.prices?.week || 0,
                month: parseInt(monthEl?.value) || p.prices?.month || 0
            },
            paymentLinks: {
                day: payDayEl?.value || p.paymentLinks?.day || '',
                week: payWeekEl?.value || p.paymentLinks?.week || '',
                month: payMonthEl?.value || p.paymentLinks?.month || ''
            },
            systemReq: p.systemReq || { os: 'Windows 10/11', processor: 'Intel Core i5', ram: '8GB', gpu: 'GTX 1050' }
        });
    }
    
    console.log('updatedProducts:', updatedProducts);
    
    if (updatedProducts.length === 0) {
        showMessage('Kaydedilecek ürün bulunamadı!', 'warning');
        return;
    }
    
    products = updatedProducts;
    saveProductsToStorage();
    
    if (window.firebaseReady && window.db && window.auth && window.auth.currentUser) {
        const userEmail = window.auth.currentUser.email;
        const isAdminEmail = ['ysufrakann@gmail.com', 'admin@matrixcheats.com', 'yusuf@matrixcheats.com'].includes(userEmail);
        
        console.log('Firebase\'ye kaydediliyor...', 'Kullanıcı:', userEmail, 'Admin:', isAdminEmail);
        
        if (isAdminEmail) {
            try {
                await window.db.collection('products').doc('products_list').set({
                    products: products,
                    updatedAt: new Date()
                });
                console.log('Firebase kaydetme başarılı!');
            } catch (e) {
                console.error('Firebase kaydetme hatası:', e);
                showMessage('Firebase kaydetme hatası: ' + e.message, 'error');
            }
        } else {
            console.warn('Admin değil!');
            showMessage('Admin yetkiniz yok!', 'error');
        }
    } else {
        console.warn('Firebase bağlı değil veya giriş yapılmamış');
        showMessage('Giriş yapılmamış veya Firebase bağlı değil', 'warning');
    }
    
    initProducts();
    renderAdminProducts();
    showMessage(updatedProducts.length + ' ürün kaydedildi!', 'success');
}

async function resetProducts() {
    showConfirm('ÜRÜNLERİ SIFIRLA', 'Tüm ürünleri sıfırlamak istediğinize emin misiniz?', async () => {
        localStorage.removeItem('matrixProducts');
        products = [];
        
        if (window.firebaseReady && window.db) {
            await window.db.collection('products').doc('products_list').set({
                products: [],
                updatedAt: new Date()
            });
        }
        
        initProducts();
        renderAdminProducts();
        showMessage('Ürünler sıfırlandı!', 'success');
    });
}

