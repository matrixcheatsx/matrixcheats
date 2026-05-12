const { setDocument, updateDocument, getDocument, COLLECTION } = require('../../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body || '{}');

    const { siparis_id, lisans_anahtari } = data;

    if (!siparis_id || !lisans_anahtari) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Siparis ID ve lisans anahtari gerekli' });
    }

    const mevcut = await getDocument(siparis_id);

    if (!mevcut) {
      return res.status(404).json({ durum: 'hata', mesaj: 'Siparis bulunamadi' });
    }

    if (mevcut.durum !== 'odendi_key_bekliyor') {
      return res.status(400).json({
        durum: 'hata',
        mesaj: `Bu siparis teslim edilmeye uygun degil. Mevcut durum: ${mevcut.durum}`
      });
    }

    await updateDocument(siparis_id, {
      lisansAnahtari,
      durum: 'teslim_edildi',
      teslimTarihi: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`Lisans anahtari teslim edildi - #${siparis_id}`);
    res.json({ durum: 'basarili', mesaj: 'Lisans anahtari basariyla teslim edildi' });

  } catch (error) {
    console.error('Teslim hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: 'Sunucu hatasi' });
  }
};
