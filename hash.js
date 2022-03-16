const crypto = require('crypto');

const generateKey = function (str) {
  const hashSum = crypto.createHash('sha256');
  var enc = new TextEncoder();

  hashSum.update(enc.encode(str));

  return hashSum.digest('hex');
};

module.exports = generateKey;
