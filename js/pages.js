function toggleFaq(element) {
    const faqItem = element.parentElement;
    const wasActive = faqItem.classList.contains('active');
    
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        const q = item.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
    });
    
    if (!wasActive) {
        faqItem.classList.add('active');
        element.setAttribute('aria-expanded', 'true');
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

document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('faq-question') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        toggleFaq(e.target);
    }
    if (e.target.classList.contains('mobile-toggle') && e.key === 'Enter') {
        e.preventDefault();
        toggleMobileMenu();
    }
});

function initLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(function() {
            loader.classList.add('hidden');
        }, 2000);
    }
}

function initMatrixCanvas() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height;
    }
    
    function drawMatrix() {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const y = drops[i] * fontSize;
            const isGreen = Math.random() > 0.7;
            const color = isGreen ? `rgba(0, 255, 65, ${Math.random() * 0.5 + 0.5})` : `rgba(255, 0, 64, ${Math.random() * 0.5 + 0.5})`;
            ctx.fillStyle = color;
            ctx.font = fontSize + 'px monospace';
            ctx.fillText(char, i * fontSize, y);
            
            if (y > canvas.height && Math.random() > 0.975) {
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

function handleAccountClick() {
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    const userEmail = user?.email || (user?._delegate?.email);
    
    if (!userEmail) {
        openAuth();
        return;
    }
    
    openProfileModal();
}

function openAuth() {
    document.getElementById('authModal').classList.add('active');
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('active');
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.remove('active');
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
    
    const profileEmailEl = document.getElementById('profileEmail');
    if (profileEmailEl) {
        profileEmailEl.textContent = userEmail;
    }
    
    const isAdmin = user?.isAdmin === true;
    const adminMenuItem = document.getElementById('adminMenuItem');
    if (adminMenuItem) {
        adminMenuItem.style.display = isAdmin ? 'flex' : 'none';
    }
    
    document.getElementById('profileModal').classList.add('active');
}

function openSupportModal() {
    const storedUser = localStorage.getItem('matrixUser');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    const userUid = user?.uid || user?._delegate?.uid;
    
    if (!user || !userUid) {
        if (typeof showMessage === 'function') {
            showMessage('Önce giriş yapmalısınız!', 'warning');
        }
        openAuth();
        return;
    }
    
    const supportModal = document.getElementById('supportModal');
    if (supportModal) {
        supportModal.classList.add('active');
    }
}

function openAdminFromProfile() {
    closeProfileModal();
    if (typeof openAdminPanel === 'function') {
        openAdminPanel();
    }
}

async function handleLogout() {
    if (typeof logoutUser === 'function') {
        await logoutUser();
    }
    
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
    
    if (typeof showMessage === 'function') {
        showMessage('Çıkış yapıldı.', 'info');
    }
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authOptions = document.getElementById('authOptions');
    
    if (loginTab && registerTab) {
        loginTab.classList.toggle('active', tab === 'login');
        registerTab.classList.toggle('active', tab === 'register');
    }
    
    if (authSubmitBtn) {
        authSubmitBtn.textContent = tab === 'login' ? 'GİRİŞ YAP' : 'KAYIT OL';
    }
    
    if (authOptions) {
        authOptions.style.display = tab === 'login' ? 'flex' : 'none';
    }
    
    const authForm = document.getElementById('authForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (authForm) authForm.style.display = 'block';
    if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
}

window.addEventListener('click', function(e) {
    const authModal = document.getElementById('authModal');
    if (e.target === authModal) {
        closeAuth();
    }
});

window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAuth();
        closeProfileModal();
    }
});