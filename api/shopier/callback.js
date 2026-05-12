const crypto = require('crypto');
const { setDocument, updateDocument, getDocument, COLLECTION } = require('../../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Sadece POST');
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body || '{}');

    const {
      random_numarasi,
      sipariss_id,
      random_str,
      hash,
      buyer_name,
      buyer_surname,
      buyer_email,
      buyer_phone,
      payment_tutar,
      payment_type,
      urunler
    } = data;

    if (!hash || !random_numarasi || !sipariss_id || !random_str) {
      console.log('Shopier callback: Eksik parametreler');
      return res.status(400).send('Eksik parametreler');
    }

    const osbKullanici = process.env.OSB_KULLANICI_ADI;
    const osbSifre = process.env.OSB_SIFRE;

    if (!osbKullanici || !osbSifre) {
      console.log('Shopier callback: OSB bilgileri eksik');
      return res.status(500).send('Sunucu yapilandirma hatasi');
    }

    const beklenenHash = crypto.createHash('md5').update(osbKullanici + osbSifre + random_numarasi + sipariss_id + random_str).digest('hex').toLowerCase();
    const gelenHash = hash.toLowerCase();

    if (beklenenHash !== gelenHash) {
      console.log(`Shopier callback: HASH BASARISIZ! Siparis #${sipariss_id}`);
      console.log(`Beklenen: ${beklenenHash}, Gelen: ${gelenHash}`);
      return res.status(403).send('Hash dogrulama basarisiz');
    }

    console.log(`Shopier callback: HASH BASARILI! Siparis #${sipariss_id}`);

    let urunAdi = '';
    let urunFiyat = 0;

    try {
      const urunList = typeof urunler === 'string' ? JSON.parse(urunler) : urunler;
      if (Array.isArray(urunList) && urunList.length > 0) {
        urunAdi = urunList[0].product_name || '';
        urunFiyat = parseFloat(urunList[0].product_price) || 0;
      }
    } catch (e) {}

    const mevcut = await getDocument(sipariss_id);
    const guncelData = {
      musteriAdi: buyer_name || '',
      musteriSoyadi: buyer_surname || '',
      musteriTelefon: buyer_phone || '',
      randomNumarasi: random_numarasi,
      randomStr: random_str,
      odemeTutari: parseFloat(payment_tutar) || urunFiyat,
      odemeTipi: payment_type || '',
      durum: 'odendi_key_bekliyor',
      odemeTarihi: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (urunAdi) guncelData.urunAdi = urunAdi;
    if (urunFiyat) guncelData.urunFiyat = urunFiyat;
    if (buyer_email) guncelData.musteriEmail = buyer_email;

    if (mevcut) {
      await updateDocument(sipariss_id, guncelData);
    } else {
      guncelData.siparisId = sipariss_id;
      guncelData.urunId = 0;
      guncelData.urunAdi = urunAdi || 'Bilinmeyen Ürün';
      guncelData.urunFiyat = urunFiyat || parseFloat(payment_tutar) || 0;
      guncelData.musteriEmail = buyer_email || '';
      guncelData.lisansAnahtari = '';
      guncelData.createdAt = new Date().toISOString();
      await setDocument(sipariss_id, guncelData);
    }

    console.log(`Shopier callback: Odeme kaydedildi - #${sipariss_id}`);
    res.status(200).send('OK');

  } catch (error) {
    console.error('Shopier callback hatasi:', error.message);
    res.status(500).send('Sunucu hatasi');
  }
};
