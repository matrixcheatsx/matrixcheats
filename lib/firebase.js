const https = require('https');
const crypto = require('crypto');

function getAccessToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const jwt = generateJWT(sa, now);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    });
    const opts = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body).access_token); }
        catch { reject(new Error('Token alınamadı')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function generateJWT(sa, now) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key, 'base64url');
  return `${header}.${payload}.${sign}`;
}

function firestoreRequest(token, method, path, body) {
  const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
  const data = body ? JSON.stringify(body) : '';
  const opts = {
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (data) opts.headers['Content-Length'] = data.length;

  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(body ? JSON.parse(body) : {}); }
          catch { resolve({}); }
        } else {
          reject(new Error(`Firestore ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const COLLECTION = 'shopier_orders';

async function setDocument(docId, data) {
  const token = await getAccessToken();
  return firestoreRequest(token, 'PATCH', `${COLLECTION}?documentId=${docId}`, { fields: toFields(data) });
}

async function updateDocument(docId, data) {
  const token = await getAccessToken();
  return firestoreRequest(token, 'PATCH', `${COLLECTION}/${docId}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`, { fields: toFields(data) });
}

async function getDocument(docId) {
  const token = await getAccessToken();
  const result = await firestoreRequest(token, 'GET', `${COLLECTION}/${docId}`);
  return result.fields ? fromFields(result.fields) : null;
}

async function queryDocuments(field, op, value) {
  const token = await getAccessToken();
  const structuredQuery = {
    structuredQuery: {
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: op,
          value: { stringValue: value }
        }
      },
      from: [{ collectionId: COLLECTION }]
    }
  };
  const result = await firestoreRequest(token, 'POST', ':runQuery', structuredQuery);
  const docs = Array.isArray(result) ? result.filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), ...fromFields(r.document.fields) })) : [];
  return docs;
}

async function listDocuments() {
  const token = await getAccessToken();
  const result = await firestoreRequest(token, 'GET', COLLECTION);
  const docs = result.documents ? result.documents.map(d => ({ id: d.name.split('/').pop(), ...fromFields(d.fields) })) : [];
  return docs;
}

function toFields(data) {
  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { doubleValue: val };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (val === null || val === undefined) fields[key] = { nullValue: null };
    else fields[key] = { stringValue: String(val) };
  }
  return fields;
}

function fromFields(fields) {
  if (!fields) return {};
  const data = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) data[key] = val.stringValue;
    else if (val.doubleValue !== undefined) data[key] = val.doubleValue;
    else if (val.integerValue !== undefined) data[key] = parseInt(val.integerValue);
    else if (val.booleanValue !== undefined) data[key] = val.booleanValue;
  }
  return data;
}

module.exports = { setDocument, updateDocument, getDocument, queryDocuments, listDocuments, COLLECTION };
