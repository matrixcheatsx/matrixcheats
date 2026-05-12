const { db, ORDERS_COLLECTION } = require('../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ durum: 'hata', mesaj: 'E-posta gerekli' });
    }

    const snapshot = await db.collection(ORDERS_COLLECTION)
      .where('musteriEmail', '==', email)
      .orderBy('createdAt', 'desc')
      .get();

    const siparisler = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        siparis_id: data.siparisId,
        urun_adi: data.urunAdi,
        urun_fiyat: data.urunFiyat,
        paket: data.paket || '',
        durum: data.durum,
        lisans_anahtari: data.lisansAnahtari || '',
        odeme_tarihi: data.odemeTarihi || '',
        teslim_tarihi: data.teslimTarihi || '',
        created_at: data.createdAt || ''
      };
    });

    res.json({ durum: 'basarili', siparisler });

  } catch (error) {
    console.error('Siparis sorgulama hatasi:', error);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
