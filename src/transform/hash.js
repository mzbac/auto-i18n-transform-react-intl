const crypto = require("crypto");

const chars = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$");

const generateKey = function (str, fileName) {
  fileName = fileName
    .replace(".jsx", "")
    .replace(".js", "")
    .replace(".tsx", "")
    .replace(".ts", "")
    .split("")
    .map((c) => {
      if (!chars.has(c)) {
        return "_";
      } else {
        return c;
      }
    })
    .join("");
  const hashSum = crypto.createHash("sha256");
  var enc = new TextEncoder();

  hashSum.update(enc.encode(str));

  return `${fileName}_` + hashSum.digest("hex").slice(0, 7);
};

module.exports = generateKey;
