const crypto = require('crypto');
const { setDocument, updateDocument, getDocument, queryDocuments, listDocuments, COLLECTION } = require('../lib/firebase');

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
    const siteUrl = 'https://matrixcheats-theta.vercel.app';
    const callbackUrl = `${siteUrl}/api/shopier/callback`;
    const apiKey = process.env.OSB_KULLANICI_ADI;
    const apiSecret = process.env.OSB_SIFRE;
    const randomNr = Math.floor(100000 + Math.random() * 899999).toString();
    const totalValue = parseFloat(urun_fiyat).toFixed(2).toString();
    const currency = '0';

    const dataToHash = randomNr + siparisId + totalValue + currency;
    const signature = crypto.createHmac('sha256', apiSecret).update(dataToHash).digest('base64');

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
      siparis_id: siparisId,
      callback_url: callbackUrl,
      shopier_form: {
        action: 'https://www.shopier.com/ShowProduct/api_pay4.php',
        method: 'POST',
        fields: {
          API_key: apiKey,
          platform_order_id: siparisId,
          product_name: urun_adi,
          product_type: '2',
          buyer_name: musteri_adi || 'Musteri',
          buyer_surname: musteri_soyadi || 'Musteri',
          buyer_email: musteri_email,
          buyer_phone: musteri_telefon || '5550000000',
          buyer_account_age: '0',
          buyer_id_nr: '0',
          billing_address: 'Address',
          billing_city: 'Istanbul',
          billing_country: 'Turkey',
          billing_postcode: '34000',
          shipping_address: 'Address',
          shipping_city: 'Istanbul',
          shipping_country: 'Turkey',
          shipping_postcode: '34000',
          total_order_value: totalValue,
          currency,
          platform: '0',
          is_in_frame: '0',
          current_language: '0',
          modul_version: '1.0.4',
          random_nr: randomNr,
          signature,
          callback: callbackUrl
        }
      }
    });

  } catch (error) {
    console.error('Checkout hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: error.message || 'Sunucu hatasi' });
  }
};
