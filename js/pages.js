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

function openAdminPanel() {
    window.location.href = 'admin.html';
}

document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('faq-question') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        toggleFaq(e.target);
    }
});

document.addEventListener('click', function(e) {
    if (e.target === document.getElementById('authModal')) closeAuth();
    if (e.target === document.getElementById('supportModal')) closeSupportModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAuth();
        closeProfileModal();
        closeSupportModal();
    }
});
