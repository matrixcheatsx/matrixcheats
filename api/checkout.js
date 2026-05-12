const { setDocument, updateDocument, getDocument, queryDocuments, listDocuments, COLLECTION } = require('../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body || '{}');

    const { urun_adi, musteri_email, urun_fiyat } = data;

    if (!urun_adi || !musteri_email || !urun_fiyat) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Eksik bilgiler' });
    }

    const siparisId = 'MC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Minimal test - store just one field
    await setDocument(siparisId, {
      siparisId,
      urun_adi: String(urun_adi),
      musteriEmail: String(musteri_email),
      urunFiyat: parseFloat(urun_fiyat),
      durum: 'odeme_bekliyor',
      createdAt: new Date().toISOString()
    });

    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.SITE_URL || 'http://localhost:3000');

    res.json({
      durum: 'basarili',
      yonlendirme: {
        siparis_id: siparisId,
        urun_adi,
        urun_fiyat: parseFloat(urun_fiyat),
        musteri_adi: data.musteri_adi || '',
        musteri_soyadi: data.musteri_soyadi || '',
        musteri_email,
        musteri_telefon: data.musteri_telefon || '',
        callback_url: `${siteUrl}/api/shopier/callback`
      }
    });

  } catch (error) {
    console.error('Checkout hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: error.message || 'Sunucu hatasi' });
  }
};
