const { listDocuments, COLLECTION } = require('../../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const docs = await listDocuments();

    const bekleyen = docs.filter(s => s.durum === 'odeme_bekliyor').length;
    const odendi = docs.filter(s => s.durum === 'odendi_key_bekliyor').length;
    const teslim = docs.filter(s => s.durum === 'teslim_edildi').length;
    const toplam = docs.length;
    const toplamGelir = docs
      .filter(s => s.durum === 'teslim_edildi')
      .reduce((t, s) => t + (parseFloat(s.urunFiyat) || 0), 0);

    res.json({
      durum: 'basarili',
      istatistik: { bekleyen, odendi, teslim, toplam, toplamGelir }
    });

  } catch (error) {
    console.error('Istatistik hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
