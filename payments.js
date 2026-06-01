const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'sessions.json');
const usedReferences = new Set();

function loadSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSessions(sessions) {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions)); } catch {}
}

function startPaymentSession(psid, products) {
  const sessions = loadSessions();
  const totalAmount = products.reduce((sum, p) => sum + p.price, 0);
  sessions[psid] = {
    products, amount: totalAmount,
    productId: products[0].id,
    productName: products.map(p => p.name).join(' + '),
    status: 'waiting_screenshot',
    attempts: 0,
    createdAt: Date.now()
  };
  saveSessions(sessions);
}

function getPaymentSession(psid) {
  const sessions = loadSessions();
  return sessions[psid] || null;
}

function updatePaymentStatus(psid, status) {
  const sessions = loadSessions();
  if (sessions[psid]) { sessions[psid].status = status; saveSessions(sessions); }
}

function clearPaymentSession(psid) {
  const sessions = loadSessions();
  delete sessions[psid];
  saveSessions(sessions);
}

function incrementAttempts(psid) {
  const sessions = loadSessions();
  if (sessions[psid]) {
    sessions[psid].attempts = (sessions[psid].attempts || 0) + 1;
    saveSessions(sessions);
    return sessions[psid].attempts;
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
  startPaymentSession, getPaymentSession, updatePaymentStatus,
  clearPaymentSession, incrementAttempts, isReferenceUsed, markReferenceUsed
};
