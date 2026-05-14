const firebaseConfig = {
    apiKey: "AIzaSyCIdRKoALvfMgIRlYjvpckRQzyWGYXSu4w",
    authDomain: "matrixcheat-0011.firebaseapp.com",
    projectId: "matrixcheat-0011",
    storageBucket: "matrixcheat-0011.firebasestorage.app",
    messagingSenderId: "398069626242",
    appId: "1:398069626242:web:7979c93b79b40b95138b9b",
    measurementId: "G-Y0WYGJMQQ7"
};

let db = null;
let auth = null;
let firebaseReady = false;

const ADMIN_EMAILS = ['admin@matrixcheats.com', 'yusuf@matrixcheats.com', 'ysufrakann@gmail.com'];
window.ADMIN_EMAILS = ADMIN_EMAILS;

if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        firebaseReady = true;
        console.log('Firebase initialized');
    } catch (e) {
        console.error('Firebase init error:', e);
    }
} else {
    console.error('Firebase SDK not found!');
}

const USERS_COLLECTION = 'users';
const ORDERS_COLLECTION = 'orders';
const PRODUCTS_COLLECTION = 'products';
const SUPPORT_COLLECTION = 'support_requests';
const CONFIRM_COLLECTION = 'order_confirmations';

async function createUser(email, password, userData) {
    if (!firebaseReady || !auth || !db) {
        return { success: false, error: 'Firebase not connected! Check console.' };
    }
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection(USERS_COLLECTION).doc(userCredential.user.uid).set({
            ...userData,
            email: email,
            createdAt: new Date()
        });
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUser(email, password) {
    if (!firebaseReady || !auth) {
        return { success: false, error: 'Firebase not connected!' };
    }
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    if (!firebaseReady || !auth) return;
    await auth.signOut();
    localStorage.removeItem('matrixUser');
    location.reload();
}

let currentUserPromise = null;
let authUnsubscribe = null;

function initAuthListener() {
    if (!firebaseReady || !auth || authUnsubscribe) return;
    authUnsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDoc = await db.collection(USERS_COLLECTION).doc(user.uid).get();
                const userData = userDoc.exists ? userDoc.data() : null;
                const isAdminByEmail = ADMIN_EMAILS.includes(user.email.toLowerCase());
                const fullUser = { 
                    ...user, 
                    ...userData,
                    isAdmin: (userData && userData.isAdmin) || isAdminByEmail
                };
                localStorage.setItem('matrixUser', JSON.stringify(fullUser));
                currentUserPromise = Promise.resolve(fullUser);
            } catch (e) {
                console.log('getCurrentUser error:', e);
                const isAdminByEmail = ADMIN_EMAILS.includes(user.email.toLowerCase());
                const fullUser = { ...user, isAdmin: isAdminByEmail };
                localStorage.setItem('matrixUser', JSON.stringify(fullUser));
                currentUserPromise = Promise.resolve(fullUser);
            }
        } else {
            localStorage.removeItem('matrixUser');
            currentUserPromise = Promise.resolve(null);
        }
    });
}

async function getCurrentUser() {
    if (!firebaseReady || !auth) return null;

    const currentUser = auth.currentUser;
    if (currentUser) {
        try {
            const userDoc = await db.collection(USERS_COLLECTION).doc(currentUser.uid).get();
            const userData = userDoc.exists ? userDoc.data() : null;
            const isAdminByEmail = ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
            const fullUser = { 
                ...currentUser, 
                ...userData,
                isAdmin: (userData && userData.isAdmin) || isAdminByEmail
            };
            localStorage.setItem('matrixUser', JSON.stringify(fullUser));
            return fullUser;
        } catch (e) {
            const isAdminByEmail = ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
            const fullUser = { ...currentUser, isAdmin: isAdminByEmail };
            localStorage.setItem('matrixUser', JSON.stringify(fullUser));
            return fullUser;
        }
    }

    if (currentUserPromise) return currentUserPromise;
    if (!authUnsubscribe) initAuthListener();
    const stored = localStorage.getItem('matrixUser');
    if (stored) {
        try {
            const u = JSON.parse(stored);
            if (u.email) {
                currentUserPromise = Promise.resolve(u);
                return currentUserPromise;
            }
        } catch {}
    }
    currentUserPromise = new Promise((resolve) => {
        const check = () => {
            if (currentUserPromise) {
                currentUserPromise.then(resolve);
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
    return currentUserPromise;
}

async function createOrder(orderData) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        const docRef = await db.collection(ORDERS_COLLECTION).add({
            ...orderData,
            status: 'Beklemede',
            createdAt: new Date()
        });
        return { success: true, orderId: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getOrdersByUser(userId) {
    if (!firebaseReady || !db) return [];
    try {
        const snapshot = await db.collection(ORDERS_COLLECTION)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting orders:', error);
        return [];
    }
}

async function getAllOrders() {
    if (!firebaseReady || !db) return [];
    try {
        const snapshot = await db.collection(ORDERS_COLLECTION).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting orders:', error);
        return [];
    }
}

async function updateOrderStatus(orderId, status) {
    if (!firebaseReady || !db) return { success: false };
    try {
        await db.collection(ORDERS_COLLECTION).doc(orderId).update({ status });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function saveProducts(productsData) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        await db.collection(PRODUCTS_COLLECTION).doc('products_list').set({
            products: productsData,
            updatedAt: new Date()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getProductsFromDB() {
    if (!firebaseReady || !db) return null;
    try {
        const doc = await db.collection(PRODUCTS_COLLECTION).doc('products_list').get();
        if (doc.exists) {
            return doc.data().products;
        }
        return null;
    } catch (error) {
        console.error('Error getting products:', error);
        return null;
    }
}

async function updateUserProfile(userId, userData) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        await db.collection(USERS_COLLECTION).doc(userId).update(userData);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
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

async function verifyAdminStatus(userId) {
    if (!firebaseReady || !db || !userId) return false;
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        return userDoc.exists && userDoc.data().isAdmin === true;
    } catch (e) {
        console.error('Admin verification error:', e);
        return false;
    }
}

function isAdmin() {
    const user = JSON.parse(localStorage.getItem('matrixUser') || '{}');
    return user.isAdmin === true;
}

async function setUserAdmin(email, isAdminRole) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        const snapshot = await db.collection(USERS_COLLECTION)
            .where('email', '==', email)
            .get();
        
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await db.collection(USERS_COLLECTION).doc(userDoc.id).update({ isAdmin: isAdminRole });
            return { success: true };
        }
        return { success: false, error: 'User not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

window.db = db;
window.auth = auth;
window.firebaseReady = firebaseReady;
window.createUser = createUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.getCurrentUser = getCurrentUser;
window.createOrder = createOrder;
window.getOrdersByUser = getOrdersByUser;
window.getAllOrders = getAllOrders;
window.updateOrderStatus = updateOrderStatus;
window.saveProductsToFirebase = saveProducts;
window.getProductsFromDB = getProductsFromDB;
window.updateUserProfile = updateUserProfile;
window.isAdmin = isAdmin;
window.setUserAdmin = setUserAdmin;
window.USERS_COLLECTION = USERS_COLLECTION;
window.ORDERS_COLLECTION = ORDERS_COLLECTION;
window.PRODUCTS_COLLECTION = PRODUCTS_COLLECTION;

async function loginWithGoogle() {
    if (!firebaseReady || !auth) {
        return { success: false, error: 'Firebase not connected!' };
    }
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        
        // Check if user exists in DB, if not create
        const userDoc = await db.collection(USERS_COLLECTION).doc(result.user.uid).get();
        if (!userDoc.exists) {
            await db.collection(USERS_COLLECTION).doc(result.user.uid).set({
                email: result.user.email,
                displayName: result.user.displayName || result.user.email.split('@')[0],
                photoURL: result.user.photoURL || '',
                isAdmin: false,
                createdAt: new Date()
            });
        }
        
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function resetPassword(email) {
    if (!firebaseReady || !auth) {
        return { success: false, error: 'Firebase not connected!' };
    }
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateUserPassword(newPassword) {
    if (!firebaseReady || !auth) {
        return { success: false, error: 'Firebase not connected!' };
    }
    try {
        const user = auth.currentUser;
        await user.updatePassword(newPassword);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createSupportRequest(supportData) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        const docRef = await db.collection(SUPPORT_COLLECTION).add({
            ...supportData,
            status: 'Yeni',
            createdAt: new Date()
        });
        return { success: true, requestId: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCheckoutOrders() {
    if (!firebaseReady || !db) return [];
    try {
        const snapshot = await db.collection('shopier_orders').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Checkout siparişleri yüklenirken hata:', error);
        return [];
    }
}

async function getSupportRequests() {
    if (!firebaseReady || !db) return [];
    try {
        console.log('Firestore query yapılıyor');
        const snapshot = await db.collection(SUPPORT_COLLECTION).orderBy('createdAt', 'desc').get();
        console.log('Snapshot size:', snapshot.size);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting support requests:', error);
        return [];
    }
}

async function updateSupportStatus(requestId, status) {
    if (!firebaseReady || !db) return { success: false };
    try {
        await db.collection(SUPPORT_COLLECTION).doc(requestId).update({ status });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createOrderConfirmation(data) {
    console.log('Sipariş onayı API\'ye gönderiliyor:', data);
    try {
        const r = await fetch('/api/confirm-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await r.json();
        console.log('API yanıtı:', result);
        if (result.durum === 'basarili') {
            return { success: true, id: result.id };
        } else {
            return { success: false, error: result.mesaj || 'API hatası' };
        }
    } catch (error) {
        console.error('Sipariş onayı API hatası:', error);
        return { success: false, error: error.message || 'Bağlantı hatası' };
    }
}

async function getOrderConfirmations() {
    if (!firebaseReady || !db) return [];
    try {
        const snapshot = await db.collection(CONFIRM_COLLECTION).get();
        console.log('Toplam doküman sayısı:', snapshot.size);
        snapshot.docs.forEach(d => console.log('Doküman ID:', d.id));
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => {
            const da = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
            const db2 = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
            return db2 - da;
        });
        return docs;
    } catch (error) {
        console.error('Error getting confirmations:', error);
        return [];
    }
}

async function updateConfirmationStatus(id, status) {
    if (!firebaseReady || !db) return { success: false };
    try {
        await db.collection(CONFIRM_COLLECTION).doc(id).update({ status });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

window.verifyAdminStatus = verifyAdminStatus;
window.sanitizeInput = sanitizeInput;
window.validateImageUrl = validateImageUrl;
window.loginWithGoogle = loginWithGoogle;
window.resetPassword = resetPassword;
window.updateUserPassword = updateUserPassword;
window.createSupportRequest = createSupportRequest;
window.getCheckoutOrders = getCheckoutOrders;
window.getSupportRequests = getSupportRequests;
window.updateSupportStatus = updateSupportStatus;
window.createOrderConfirmation = createOrderConfirmation;
window.getOrderConfirmations = getOrderConfirmations;
window.updateConfirmationStatus = updateConfirmationStatus;
const CONTACT_COLLECTION = 'contact_messages';

async function createContactMessage(data) {
    if (!firebaseReady || !db) return { success: false, error: 'Firebase not connected!' };
    try {
        await db.collection(CONTACT_COLLECTION).add({
            ...data,
            createdAt: new Date()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

window.createContactMessage = createContactMessage;
window.CONTACT_COLLECTION = CONTACT_COLLECTION;
window.SUPPORT_COLLECTION = SUPPORT_COLLECTION;
window.CONFIRM_COLLECTION = CONFIRM_COLLECTION;