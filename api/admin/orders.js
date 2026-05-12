const { db, ORDERS_COLLECTION } = require('../../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const { durum } = req.query;
    let snapshot;

    if (durum) {
      snapshot = await db.collection(ORDERS_COLLECTION)
        .where('durum', '==', durum)
        .orderBy('createdAt', 'desc')
        .get();
    } else {
      snapshot = await db.collection(ORDERS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .get();
    }

    const siparisler = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ durum: 'basarili', siparisler });

  } catch (error) {
    console.error('Admin siparis listesi hatasi:', error);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
