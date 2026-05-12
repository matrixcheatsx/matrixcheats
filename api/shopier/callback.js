const crypto = require('crypto');
const { setDocument, updateDocument, getDocument, COLLECTION } = require('../../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Sadece POST');
  }

  try {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    await new Promise(resolve => req.on('end', resolve));

    const params = new URLSearchParams(raw);
    const resParam = params.get('res');
    const hashParam = params.get('hash');

    if (!resParam || !hashParam) {
      console.log('Shopier callback: Eksik parametreler');
      return res.status(400).send('Eksik parametreler');
    }

    const apiUser = process.env.OSB_KULLANICI_ADI;
    const apiSecret = process.env.OSB_SIFRE;

    const expectedHash = crypto.createHmac('sha256', apiSecret)
      .update(resParam + apiUser)
      .digest('hex');

    if (expectedHash !== hashParam) {
      console.log('Shopier callback: Imza basarisiz');
      return res.status(403).send('Imza dogrulama basarisiz');
    }

    const jsonStr = Buffer.from(resParam, 'base64').toString('utf-8');
    const result = JSON.parse(jsonStr);

    const {
      email: musteriEmail,
      orderid: siparisId,
      price: urunFiyat,
      buyername: musteriAdi,
      buyersurname: musteriSoyadi,
      productid: productId,
      productlist: productList,
      istest: isTest
    } = result;

    console.log(`Shopier callback: Basarili - Siparis #${siparisId}, Tutar: ${urunFiyat}, Test: ${isTest}`);

    const updateData = {
      durum: 'odendi_key_bekliyor',
      odemeTarihi: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      musteriEmail: musteriEmail || '',
      musteriAdi: musteriAdi || '',
      musteriSoyadi: musteriSoyadi || '',
      urunFiyat: parseFloat(urunFiyat) || 0,
      productId: productId || '',
      productList: productList || '',
      isTest: isTest || '0'
    };

    const mevcut = await getDocument(siparisId);
    if (mevcut) {
      await updateDocument(siparisId, updateData);
    } else {
      updateData.siparisId = siparisId;
      updateData.urunAdi = 'Bilinmeyen Ürün';
      updateData.lisansAnahtari = '';
      updateData.createdAt = new Date().toISOString();
      await setDocument(siparisId, updateData);
    }

    res.status(200).send('success');

  } catch (error) {
    console.error('Shopier callback hatasi:', error.message);
    res.status(500).send('Sunucu hatasi');
  }
};
