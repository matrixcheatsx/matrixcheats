import { db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot, query, limit, signInWithEmailAndPassword, signOut } from './firebase-config.js';

/**
 * ADMIN MODULE
 * Oyun CRUD işlemleri, sipariş yönetimi ve admin yetkilendirme.
 */

export let adminLoggedIn = false;

// Admin Girişi
window.adminLogin = async function() {
  const email = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value;
  const btn = document.getElementById("adminLoginBtn");

  if (!email || !pass) { window.toast("E-POSTA VE SIFRE GEREKLI", true); return; }

  btn.disabled = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    // Yetki Kontrolü: Firestore'daki 'admins' koleksiyonunda UID kontrolü
    const adminSnap = await getDoc(doc(db, "admins", cred.user.uid));

    if (!adminSnap.exists()) {
      await signOut(auth);
      window.toast("YETKINIZ YOK", true);
      return;
    }

    adminLoggedIn = true;
    document.getElementById("admLoginWrap").style.display = "none";
    document.getElementById("admPanelWrap").style.display = "block";
    admSwitchTab("dashboard");
    listenAdminOrders();
    window.toast("ADMIN ERISIMI ONAYLANDI");
  } catch (e) {
    window.toast("GIRIS REDDEDILDI", true);
  } finally {
    btn.disabled = false;
  }
};

// Admin Çıkışı
window.adminLogout = async function() {
  adminLoggedIn = false;
  document.getElementById("admLoginWrap").style.display = "flex";
  document.getElementById("admPanelWrap").style.display = "none";
  try { await signOut(auth); } catch (e) {}
  window.toast("GUVENLI CIKIS YAPILDI");
};

// Admin Sekme Değişimi
window.admSwitchTab = function(tab) {
  document.querySelectorAll('.adm-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.adm-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('admTab-' + tab);
  if (el) el.classList.add('active');

  if (tab === 'manage') renderAdminManage();
  if (tab === 'orders') listenAdminOrders();
};

// --- OYUN YÖNETİMİ (CRUD) ---

window.saveGame = async function() {
  if (!adminLoggedIn) return;

  const editId = document.getElementById("editId").value;
  const data = {
    name: document.getElementById("gname").value.trim(),
    desc: document.getElementById("gdesc").value.trim(),
    genre: document.getElementById("ggenre").value,
    size: document.getElementById("gsize").value.trim(),
    price: parseFloat(document.getElementById("gprice").value) || 0,
    discount: parseInt(document.getElementById("gdiscount").value) || 0,
    buylink: document.getElementById("gbuylink").value.trim(),
    badge: document.getElementById("gbadge").value,
    status: document.getElementById("gstatus").value || "active",
    cpu: document.getElementById("gcpu").value.trim(),
    ram: document.getElementById("gram").value.trim(),
    gpu: document.getElementById("ggpu").value.trim(),
    platform: document.getElementById("gplatform").value.trim(),
    img: document.getElementById("gimgurl").value.trim() || "https://via.placeholder.com/300x400",
    updatedAt: Date.now()
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "games", editId), data);
      window.toast("OYUN GUNCELLENDI");
    } else {
      data.createdAt = Date.now();
      data.rating = 0;
      await addDoc(collection(db, "games"), data);
      window.toast("YENI OYUN EKLENDI");
    }
    window.cancelEditMode();
  } catch (e) {
    window.toast("HATA: " + e.message, true);
  }
};

window.editGame = function(id) {
    // Bu fonksiyon games listesine ihtiyaç duyar, app.js ile koordineli çalışmalı
    const g = window.allGames.find(x => x.id === id);
    if (!g) return;

    document.getElementById("editId").value = id;
    document.getElementById("gname").value = g.name || "";
    document.getElementById("gdesc").value = g.desc || "";
    // ... form alanlarını doldurma (app.js üzerinden gelen veri ile)
    admSwitchTab('addgame');
};

// --- SİPARİŞ YÖNETİMİ ---

let ordersListener = null;
export function listenAdminOrders() {
  if (ordersListener) return;
  ordersListener = onSnapshot(collection(db, 'orders'), snap => {
    const orders = snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
    renderAdminOrders(orders);
  });
}

function renderAdminOrders(orders) {
  const el = document.getElementById('adminOrdersList');
  if (!el) return;
  if (!orders.length) { el.innerHTML = '<div class="empty-state">// Sipariş yok</div>'; return; }

  el.innerHTML = orders.map(o => `
    <div class="adm-order-row">
      <div class="adm-order-top">
        <span class="adm-order-num">#${o.orderNum}</span>
        <span class="status-badge ${o.status}">${o.status.toUpperCase()}</span>
      </div>
      <div><b>${o.gameName}</b> - ${o.userName}</div>
      <div class="adm-order-actions">
        <button onclick="updateOrderStatus('${o.id}', 'confirmed')">Onayla</button>
        <button onclick="updateOrderStatus('${o.id}', 'delivered')">Teslim Et</button>
      </div>
    </div>
  `).join('');
}

window.updateOrderStatus = async function(id, status) {
  try {
    await updateDoc(doc(db, "orders", id), { status, updatedAt: Date.now() });
    window.toast("SIPARIS DURUMU GUNCELLENDI");
  } catch (e) {
    window.toast("HATA", true);
  }
};