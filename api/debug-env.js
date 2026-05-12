module.exports = async (req, res) => {
  const osbUser = process.env.OSB_KULLANICI_ADI;
  const osbPass = process.env.OSB_SIFRE;
  const fb = process.env.FIREBASE_SERVICE_ACCOUNT;

  res.json({
    OSB_KULLANICI_ADI: osbUser ? (osbUser.substring(0, 8) + '... [SET]') : 'NOT SET',
    OSB_SIFRE: osbPass ? (osbPass.substring(0, 8) + '... [SET]') : 'NOT SET',
    FIREBASE_SERVICE_ACCOUNT: fb ? '... [SET] (' + fb.length + ' chars)' : 'NOT SET'
  });
};
