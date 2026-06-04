const redis = require('./upstash');
const { getProductById } = require('./products');

const SESSION_EXPIRY_SEC = 24 * 60 * 60; // 24 ora
const usedReferences = new Set();

async function startPaymentSession(psid, products) {
  const totalAmount = products.reduce((sum, p) => sum + p.price, 0);
  const session = {
    products,
    amount: totalAmount,
    productId: products[0].id,
    productName: products.map(p => p.name).join(' + '),
    status: 'waiting_screenshot',
    attempts: 0,
    createdAt: Date.now()
  };
  await redis.set(`session:${psid}`, JSON.stringify(session), { ex: SESSION_EXPIRY_SEC });
}

async function getPaymentSession(psid) {
  const data = await redis.get(`session:${psid}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function updatePaymentStatus(psid, status) {
  const data = await redis.get(`session:${psid}`);
  if (!data) return;
  const session = typeof data === 'string' ? JSON.parse(data) : data;
  session.status = status;
  await redis.set(`session:${psid}`, JSON.stringify(session), { ex: SESSION_EXPIRY_SEC });
}

async function clearPaymentSession(psid) {
  await redis.del(`session:${psid}`);
}

async function incrementAttempts(psid) {
  const data = await redis.get(`session:${psid}`);
  if (!data) return 0;
  const session = typeof data === 'string' ? JSON.parse(data) : data;
  session.attempts = (session.attempts || 0) + 1;
  await redis.set(`session:${psid}`, JSON.stringify(session), { ex: SESSION_EXPIRY_SEC });
  return session.attempts;
}

function isReferenceUsed(ref) { return ref ? usedReferences.has(ref.trim().toLowerCase()) : false; }
function markReferenceUsed(ref) { if (ref) usedReferences.add(ref.trim().toLowerCase()); }

module.exports = { startPaymentSession, getPaymentSession, updatePaymentStatus, clearPaymentSession, incrementAttempts, isReferenceUsed, markReferenceUsed };
