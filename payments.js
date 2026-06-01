const fs = require('fs');
const path = require('path');
const SESSION_FILE = path.join(__dirname, 'sessions.json');
const usedReferences = new Set();

function loadSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveSessions(s) {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(s)); } catch {}
}

function startPaymentSession(psid, products) {
  const s = loadSessions();
  const totalAmount = products.reduce((sum, p) => sum + p.price, 0);
  s[psid] = { products, amount: totalAmount, productId: products[0].id, productName: products.map(p => p.name).join(' + '), status: 'waiting_screenshot', attempts: 0, createdAt: Date.now() };
  saveSessions(s);
}

function getPaymentSession(psid) { return loadSessions()[psid] || null; }

function updatePaymentStatus(psid, status) {
  const s = loadSessions();
  if (s[psid]) { s[psid].status = status; saveSessions(s); }
}

function clearPaymentSession(psid) {
  const s = loadSessions();
  delete s[psid];
  saveSessions(s);
}

function incrementAttempts(psid) {
  const s = loadSessions();
  if (s[psid]) { s[psid].attempts = (s[psid].attempts || 0) + 1; saveSessions(s); return s[psid].attempts; }
  return 0;
}

function isReferenceUsed(ref) { return ref ? usedReferences.has(ref.trim().toLowerCase()) : false; }
function markReferenceUsed(ref) { if (ref) usedReferences.add(ref.trim().toLowerCase()); }

module.exports = { startPaymentSession, getPaymentSession, updatePaymentStatus, clearPaymentSession, incrementAttempts, isReferenceUsed, markReferenceUsed };
