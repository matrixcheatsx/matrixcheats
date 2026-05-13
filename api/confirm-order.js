const https = require('https');
const crypto = require('crypto');

const CONFIRM_COLLECTION = 'order_confirmations';

function getAccessToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key, 'base64url');
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${payload}.${sign}` });
    const opts = { hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body).access_token); } catch { reject(new Error('Token alınamadı')); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function firestoreRequest(token, method, path, body) {
  const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
  const data = body ? JSON.stringify(body) : '';
  const opts = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (data) opts.headers['Content-Length'] = Buffer.byteLength(data, 'utf8');
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
        } else {
          reject(new Error(`Firestore ${res.statusCode}: ${body.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function toFields(data) {
  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else fields[key] = { stringValue: String(val) };
  }
  return fields;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ durum: 'hata', mesaj: 'Sadece POST' });
  }

  try {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body || '{}');

    const { orderNumber, gmail, userEmail, product, note, userId } = data;

    if (!orderNumber || !gmail || !product) {
      return res.status(400).json({ durum: 'hata', mesaj: 'Eksik bilgiler: sipariş no, gmail ve ürün zorunlu' });
    }

    const siparisId = 'MC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const token = await getAccessToken();

    await firestoreRequest(token, 'PATCH', `${CONFIRM_COLLECTION}/${siparisId}`, {
      fields: toFields({
        id: siparisId,
        orderNumber,
        gmail,
        userEmail: userEmail || '',
        product,
        note: note || '',
        userId: userId || '',
        status: 'Onay Bekliyor',
        createdAt: new Date().toISOString()
      })
    });

    console.log('Sipariş onayı kaydedildi:', siparisId);
    res.json({ durum: 'basarili', id: siparisId });
  } catch (error) {
    console.error('Sipariş onayı hatasi:', error.message);
    res.status(500).json({ durum: 'hata', mesaj: error.message || 'Sunucu hatasi' });
  }
};
