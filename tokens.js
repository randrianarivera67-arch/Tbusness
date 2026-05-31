const { v4: uuidv4 } = require('uuid');

// Fitahirizana tokens in-memory (azonao ovaina Redis na MongoDB any aoriana)
const tokenStore = new Map();

const TOKEN_EXPIRY_MS = 72 * 60 * 60 * 1000; // 24 ora

function createDownloadToken(productId, buyerPsid) {
  const token = uuidv4();
  tokenStore.set(token, {
    productId,
    buyerPsid,
    createdAt: Date.now(),
    used: false,
  });
  return token;
}

function validateAndConsumeToken(token) {
  const data = tokenStore.get(token);
  if (!data) return { valid: false, reason: 'Token tsy misy' };
  if (data.used) return { valid: false, reason: 'Efa nampiasaina ity token ity' };
  if (Date.now() - data.createdAt > TOKEN_EXPIRY_MS) {
    tokenStore.delete(token);
    return { valid: false, reason: 'Token dila (24 ora)' };
  }
  data.used = true;
  tokenStore.set(token, data);
  return { valid: true, productId: data.productId };
}

function getTokenInfo(token) {
  return tokenStore.get(token) || null;
}

module.exports = { createDownloadToken, validateAndConsumeToken, getTokenInfo };
