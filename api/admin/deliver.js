const parseBody = require('../../lib/body-parser');
const { db, ORDERS_COLLECTION } = require('../../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    const body = await parseBody(req);
    const { siparis_id, lisans_anahtari } = body;

    if (!siparis_id || !lisans_anahtari) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Siparis ID ve lisans anahtari gerekli' });
    }

    const siparisDoc = await db.collection(ORDERS_COLLECTION).doc(siparis_id).get();

    if (!siparisDoc.exists) {
      return res.status(404).json({ durum: 'hata', mesaj: 'Siparis bulunamadi' });
    }

    const siparis = siparisDoc.data();

    if (siparis.durum !== 'odendi_key_bekliyor') {
      return res.status(400).json({
        durum: 'hata',
        mesaj: `Bu siparis teslim edilmeye uygun degil. Mevcut durum: ${siparis.durum}`
      });
    }

    await db.collection(ORDERS_COLLECTION).doc(siparis_id).update({
      lisansAnahtari,
      durum: 'teslim_edildi',
      teslimTarihi: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`Lisans anahtari teslim edildi - #${siparis_id}`);
    res.json({ durum: 'basarili', mesaj: 'Lisans anahtari basariyla teslim edildi' });

  } catch (error) {
    console.error('Teslim hatasi:', error);
    res.status(500).json({ durum: 'hata', mesaj: 'Sunucu hatasi' });
  }
};
