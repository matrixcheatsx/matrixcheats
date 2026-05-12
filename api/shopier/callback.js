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
    const data = JSON.parse(raw || '{}');

    const {
      platform_order_id,
      status,
      payment_id,
      random_nr,
      signature,
      installment
    } = data;

    if (!signature || !platform_order_id || !random_nr) {
      console.log('Shopier callback: Eksik parametreler');
      return res.status(400).send('Eksik parametreler');
    }

    const apiSecret = process.env.OSB_SIFRE;

    const expectedSig = crypto.createHmac('sha256', apiSecret)
      .update(random_nr + platform_order_id)
      .digest();

    const decodedSig = Buffer.from(signature, 'base64');

    if (!crypto.timingSafeEqual(expectedSig, decodedSig)) {
      console.log(`Shopier callback: I M Z A  B A S A R I S I Z! Siparis #${platform_order_id}`);
      console.log(`Beklenen: ${expectedSig.toString('base64')}, Gelen: ${signature}`);
      return res.status(403).send('Imza dogrulama basarisiz');
    }

    console.log(`Shopier callback: I M Z A  B A S A R I L I! Siparis #${platform_order_id}`);

    const isSuccess = status === 'success';

    const updateData = {
      durum: isSuccess ? 'odendi_key_bekliyor' : 'odeme_basarisiz',
      odemeTarihi: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shopierStatus: status || '',
      shopierPaymentId: payment_id || '',
      shopierInstallment: installment || '0',
      shopierRandomNr: random_nr
    };

    const mevcut = await getDocument(platform_order_id);
    if (mevcut) {
      await updateDocument(platform_order_id, updateData);
    } else {
      updateData.siparisId = platform_order_id;
      updateData.urun_adi = 'Bilinmeyen Ürün';
      updateData.urunFiyat = 0;
      updateData.musteriEmail = '';
      updateData.lisansAnahtari = '';
      updateData.createdAt = new Date().toISOString();
      await setDocument(platform_order_id, updateData);
    }

    console.log(`Shopier callback: Odeme ${isSuccess ? 'basarili' : 'basarisiz'} - #${platform_order_id}`);
    res.status(200).send('OK');

  } catch (error) {
    console.error('Shopier callback hatasi:', error.message);
    res.status(500).send('Sunucu hatasi');
  }
};
