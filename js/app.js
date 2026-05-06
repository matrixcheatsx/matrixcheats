import { db, collection, onSnapshot, query, orderBy } from './firebase-config.js';

/**
 * MAIN APPLICATION MODULE
 * Mağaza mantığı, sepet işlemleri ve sayfa yönetimi.
 */

window.allGames = [];
let cart = [];
let filterGenre = "hepsi";
let searchTerm = "";

// Uygulamayı Başlat
document.addEventListener('DOMContentLoaded', async () => {
  // Görselleri Başlat
  if (window.initVisuals) window.initVisuals();

  // Bileşenleri Yükle (Gerçek projede fetch ile yapılabilir, biz şimdilik statik yapıya güveniyoruz)
  // Not: Single Page Application mantığı için index.html'de yer alacaklar.

  listenGames();
});

// Oyunları Firestore'dan Dinle
function listenGames() {
  const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    window.allGames = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    renderGames();
  });
}

// Sayfa Geçişi
window.showPage = function(name) {
  const pages = {
    home: "pageHome",
    about: "pageAbout",
    contact: "pageContact",
    privacy: "pagePrivacy",
    terms: "pageTerms",
    profile: "pageProfile",
    detail: "pageDetail",
    admin: "pageAdmin"
  };

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const targetId = pages[name] || "page404";
  const targetEl = document.getElementById(targetId);
  if (targetEl) targetEl.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Oyunları Render Et
export function renderGames() {
  const list = document.getElementById("gameList");
  if (!list) return;

  const filtered = window.allGames.filter(g => {
    const matchGenre = filterGenre === "hepsi" || g.genre === filterGenre;
    const matchSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchGenre && matchSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">// Oyun bulunamadı</div>`;
    return;
  }

  list.innerHTML = filtered.map(g => `
    <div class="game" onclick="openDetailPage('${g.id}')">
      ${g.badge ? `<div class="badge ${g.badge}">${g.badge.toUpperCase()}</div>` : ""}
      <img src="${g.img}" alt="${g.name}">
      <div class="info">
        <h3>${g.name}</h3>
        <div class="genre">${g.genre.toUpperCase()}</div>
        <div class="price-row">
            <span class="price">${g.price === 0 ? 'ÜCRETSİZ' : '₺' + g.price}</span>
        </div>
        <button class="btn-dl">İNCELE</button>
      </div>
    </div>
  `).join('');
}

// Arama ve Filtreleme
window.filterGames = function() {
  searchTerm = document.getElementById("searchInput").value;
  renderGames();
};

window.setFilter = function(genre, el) {
  filterGenre = genre;
  document.querySelectorAll(".tag").forEach(t => t.classList.remove("active"));
  if (el) el.classList.add("active");
  renderGames();
};

// Detay Sayfası Aç
window.openDetailPage = function(id) {
  const g = window.allGames.find(x => x.id === id);
  if (!g) return;

  document.getElementById("dTitle").textContent = g.name;
  document.getElementById("dImg").src = g.img;
  document.getElementById("dDesc").textContent = g.desc;
  document.getElementById("dPrice").textContent = g.price === 0 ? "ÜCRETSİZ" : "₺" + g.price;

  window.showPage('detail');
};

// Toast Mesajı
window.toast = function(msg, isErr = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.background = isErr ? "#ff2020" : "#00ff88";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
};

// Sepet İşlemleri
window.openCart = () => document.getElementById("cartOverlay").classList.add("open");
window.closeCart = () => document.getElementById("cartOverlay").classList.remove("open");

// UI Helpers
window.toggleMenu = () => {
    document.getElementById("hamburger").classList.toggle("open");
    document.getElementById("mobileMenu").classList.toggle("open");
};