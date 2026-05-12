module.exports = async (req, res) => {
  let body = {};
  try {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    await new Promise(resolve => req.on('end', resolve));
    body = raw ? JSON.parse(raw) : {};
  } catch (e) {}

  res.json({
    method: req.method,
    body,
    env: {
      hasFirebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      hasOsbKullanici: !!process.env.OSB_KULLANICI_ADI,
      hasOsbSifre: !!process.env.OSB_SIFRE,
      vercelUrl: process.env.VERCEL_URL || 'not set'
    }
  });
};
