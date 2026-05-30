// Fitahirizana état payment isaky ny user (psid -> payment session)
const paymentSessions = new Map();

// Manomboka session payment ho an'ny user iray
function startPaymentSession(psid, productId, productName, amount) {
  paymentSessions.set(psid, {
    productId,
    productName,
    amount,
    status: 'waiting_screenshot', // waiting_screenshot | verifying | completed | failed
    attempts: 0,
    startedAt: Date.now(),
  });
}

// Mahazo session payment an'ny user
function getPaymentSession(psid) {
  return paymentSessions.get(psid) || null;
}

// Manova status
function updatePaymentStatus(psid, status) {
  const session = paymentSessions.get(psid);
  if (session) {
    session.status = status;
    paymentSessions.set(psid, session);
  }
}

// Faafoanana session (rehefa vita na nolà)
function clearPaymentSession(psid) {
  paymentSessions.delete(psid);
}

// Fanisana isa fandravana
function incrementAttempts(psid) {
  const session = paymentSessions.get(psid);
  if (session) {
    session.attempts += 1;
    paymentSessions.set(psid, session);
    return session.attempts;
  }
  return 0;
}

module.exports = {
  startPaymentSession,
  getPaymentSession,
  updatePaymentStatus,
  clearPaymentSession,
  incrementAttempts,
};
