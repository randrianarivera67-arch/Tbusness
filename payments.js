const paymentSessions = new Map();
const usedReferences = new Set();

function startPaymentSession(psid, products) {
  // products = [{ id, name, price }, ...]
  const totalAmount = products.reduce((sum, p) => sum + p.price, 0);
  paymentSessions.set(psid, {
    products,
    amount: totalAmount,
    productId: products[0].id, // backward compat
    productName: products.map(p => p.name).join(' + '),
    status: 'waiting_screenshot',
    attempts: 0,
    createdAt: Date.now()
  });
}

function getPaymentSession(psid) {
  return paymentSessions.get(psid) || null;
}

function updatePaymentStatus(psid, status) {
  const session = paymentSessions.get(psid);
  if (session) session.status = status;
}

function clearPaymentSession(psid) {
  paymentSessions.delete(psid);
}

function incrementAttempts(psid) {
  const session = paymentSessions.get(psid);
  if (session) {
    session.attempts = (session.attempts || 0) + 1;
    return session.attempts;
  }
  return 0;
}

function isReferenceUsed(reference) {
  if (!reference) return false;
  return usedReferences.has(reference.trim().toLowerCase());
}

function markReferenceUsed(reference) {
  if (reference) usedReferences.add(reference.trim().toLowerCase());
}

module.exports = {
  startPaymentSession,
  getPaymentSession,
  updatePaymentStatus,
  clearPaymentSession,
  incrementAttempts,
  isReferenceUsed,
  markReferenceUsed
};
