const md5 = require('md5');
const { db, ORDERS_COLLECTION } = require('../../lib/firebase-admin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Sadece POST');
  }

  try {
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
    } = req.body;

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

    const beklenenHash = md5(osbKullanici + osbSifre + random_numarasi + sipariss_id + random_str).toLowerCase();
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

    const siparisDoc = await db.collection(ORDERS_COLLECTION).doc(sipariss_id).get();

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

    if (siparisDoc.exists) {
      await db.collection(ORDERS_COLLECTION).doc(sipariss_id).update(guncelData);
    } else {
      guncelData.siparisId = sipariss_id;
      guncelData.urunId = 0;
      guncelData.urunAdi = urunAdi || 'Bilinmeyen Ürün';
      guncelData.urunFiyat = urunFiyat || parseFloat(payment_tutar) || 0;
      guncelData.musteriEmail = buyer_email || '';
      guncelData.lisansAnahtari = '';
      guncelData.createdAt = new Date().toISOString();
      await db.collection(ORDERS_COLLECTION).doc(sipariss_id).set(guncelData);
    }

    console.log(`Shopier callback: Odeme kaydedildi - #${sipariss_id}`);
    res.status(200).send('OK');

  } catch (error) {
    console.error('Shopier callback hatasi:', error);
    res.status(500).send('Sunucu hatasi');
  }
};
