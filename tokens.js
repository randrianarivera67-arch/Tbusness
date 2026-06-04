const { v4: uuidv4 } = require('uuid');
const redis = require('./upstash');

const TOKEN_EXPIRY_SEC = 72 * 60 * 60; // 72 ora

async function createDownloadToken(productId, buyerPsid) {
  const token = uuidv4();
  await redis.set(`token:${token}`, JSON.stringify({ productId, buyerPsid, used: false }), { ex: TOKEN_EXPIRY_SEC });
  return token;
}

async function validateAndConsumeToken(token) {
  const data = await redis.get(`token:${token}`);
  if (!data) return { valid: false, reason: 'Token tsy misy' };
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed.used) return { valid: false, reason: 'Efa nampiasaina ity token ity' };
  parsed.used = true;
  await redis.set(`token:${token}`, JSON.stringify(parsed), { ex: TOKEN_EXPIRY_SEC });
  return { valid: true, productId: parsed.productId };
}

async function getTokenInfo(token) {
  const data = await redis.get(`token:${token}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

module.exports = { createDownloadToken, validateAndConsumeToken, getTokenInfo };
