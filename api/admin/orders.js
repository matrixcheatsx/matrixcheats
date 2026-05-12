const { queryDocuments, listDocuments, updateDocument, COLLECTION } = require('../../lib/firebase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece GET' });
  }

  try {
    const { durum } = req.query;
    let docs;

    if (durum) {
      docs = await queryDocuments('durum', 'EQUAL', durum);
    } else {
      docs = await listDocuments();
    }

    docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const siparisler = docs.map(d => ({ id: d.siparisId, ...d }));
    res.json({ durum: 'basarili', siparisler });

  } catch (error) {
    console.error('Admin siparis listesi hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: 'Veritabani hatasi' });
  }
};
