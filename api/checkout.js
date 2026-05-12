const { db, ORDERS_COLLECTION } = require('../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    const { urun_id, urun_adi, urun_fiyat, musteri_adi, musteri_soyadi, musteri_email, musteri_telefon, paket } = req.body;

    if (!urun_adi || !musteri_email || !urun_fiyat) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Eksik bilgiler' });
    }

    const siparisId = 'MC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    await db.collection(ORDERS_COLLECTION).doc(siparisId).set({
      siparisId,
      urunId: urun_id || 0,
      urunAdi,
      urunFiyat: parseFloat(urun_fiyat),
      paket: paket || '',
      musteriAdi: musteri_adi || '',
      musteriSoyadi: musteri_soyadi || '',
      musteriEmail: musteri_email,
      musteriTelefon: musteri_telefon || '',
      durum: 'odeme_bekliyor',
      lisansAnahtari: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.SITE_URL || 'http://localhost:3000');

    const callbackUrl = `${siteUrl}/api/shopier/callback`;

    res.json({
      durum: 'basarili',
      yonlendirme: {
        siparis_id: siparisId,
        urun_adi: urunAdi,
        urun_fiyat: parseFloat(urun_fiyat),
        musteri_adi,
        musteri_soyadi,
        musteri_email,
        musteri_telefon,
        callback_url: callbackUrl
      }
    });

  } catch (error) {
    console.error('Checkout hatasi:', error);
    res.status(500).json({ durum: 'hata', mesaj: 'Sunucu hatasi' });
  }
};
