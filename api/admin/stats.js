const { db, ORDERS_COLLECTION } = require('../../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const tumu = await db.collection(ORDERS_COLLECTION).get();
    const tumSiparisler = tumu.docs.map(d => d.data());

    const bekleyen = tumSiparisler.filter(s => s.durum === 'odeme_bekliyor').length;
    const odendi = tumSiparisler.filter(s => s.durum === 'odendi_key_bekliyor').length;
    const teslim = tumSiparisler.filter(s => s.durum === 'teslim_edildi').length;
    const toplam = tumSiparisler.length;
    const toplamGelir = tumSiparisler
      .filter(s => s.durum === 'teslim_edildi')
      .reduce((t, s) => t + (parseFloat(s.urunFiyat) || 0), 0);

    res.json({
      durum: 'basarili',
      istatistik: { bekleyen, odendi, teslim, toplam, toplamGelir }
    });

  } catch (error) {
    console.error('Istatistik hatasi:', error);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
