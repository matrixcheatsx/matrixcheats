const { queryDocuments, listDocuments, COLLECTION } = require('../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ durum: 'hata', mesaj: 'E-posta gerekli' });
    }

    const docs = await queryDocuments('musteriEmail', 'EQUAL', email);

    const siparisler = docs.map(d => ({
      siparis_id: d.siparisId,
      urun_adi: d.urunAdi,
      urun_fiyat: d.urunFiyat,
      paket: d.paket || '',
      durum: d.durum,
      lisans_anahtari: d.lisansAnahtari || '',
      odeme_tarihi: d.odemeTarihi || '',
      teslim_tarihi: d.teslimTarihi || '',
      created_at: d.createdAt || ''
    }));

    res.json({ durum: 'basarili', siparisler });

  } catch (error) {
    console.error('Siparis sorgulama hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
