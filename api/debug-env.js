module.exports = async (req, res) => {
  const fb = process.env.FIREBASE_SERVICE_ACCOUNT;

  res.json({
    FIREBASE_SERVICE_ACCOUNT: fb ? '... [SET] (' + fb.length + ' chars)' : 'NOT SET'
  });
};
