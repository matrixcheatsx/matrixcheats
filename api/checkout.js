const { setDocument } = require('../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body || '{}');

    const { urun_adi, musteri_email, urun_fiyat, musteri_adi, musteri_soyadi, musteri_telefon } = data;

    if (!urun_adi || !musteri_email || !urun_fiyat) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Eksik bilgiler' });
    }

    const siparisId = 'MC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    await setDocument(siparisId, {
      siparisId,
      urun_adi,
      urunFiyat: parseFloat(urun_fiyat),
      musteriEmail: musteri_email,
      durum: 'odeme_bekliyor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      musteri_adi: musteri_adi || '',
      musteri_soyadi: musteri_soyadi || '',
      musteri_telefon: musteri_telefon || ''
    });

    res.json({
      durum: 'basarili',
      siparis_id: siparisId
    });

  } catch (error) {
    console.error('Checkout hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: error.message || 'Sunucu hatasi' });
  }
};
