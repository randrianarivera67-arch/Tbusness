const Groq = require('groq-sdk');
const { getProductListText } = require('./products');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const conversationHistory = new Map();

function getHistory(psid) {
  if (!conversationHistory.has(psid)) conversationHistory.set(psid, []);
  return conversationHistory.get(psid);
}

function clearHistory(psid) {
  conversationHistory.set(psid, []);
}

const SYSTEM_PROMPT = 'Ianao dia bot fivarotana logiciel malagasy. Anaranao: TechBot. Miteny Malagasy foana ianao mazava mamy professional. LOGICIEL AMIDY: ' + getProductListText() + ' ANDRAIKITRAO: 1. Mampiseho lisitra logiciel 2. Manazava raha mangataka 3. Lazao vidiny sy numero fandefasana raha te hividy 4. Hangataho screenshot rehefa vita payment 5. Mora sy tsara fo mandrakariva. DISO ATAO: aza mandefa lien download mivantana ary aza mandray vola an-tanana.';

async function chat(psid, userMessage) {
  const history = getHistory(psid);
  if (history.length > 20) history.splice(0, 2);
  console.log('[Groq] Chat PSID ' + psid);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
    { role: 'user', content: userMessage }
  ];
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: 500,
  });
  const reply = completion.choices[0].message.content;
  console.log('[Groq] Valiny: ' + reply.substring(0, 80));
  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: reply });
  return reply;
}

async function verifyPaymentScreenshot(imageBase64, mediaType, expectedAmount, productName) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = 'Jereo ity screenshot ity. Sary confirmation payment MVola na Orange Money io. Valiana JSON fotsiny: { "success": true/false, "amount": number|null, "reference": string|null, "date": string|null, "reason": string|null }. Raha montant = ' + expectedAmount + ' Ar ary vita ny payment: success true. Raha tsy mifanaraka: success false.';
  const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType: mediaType } }]);
  const text = result.response.text().replace(/json|/g, '').trim();
  try { return JSON.parse(text); }
  catch { return { success: false, reason: 'Tsy afaka mamaky valim-panamarinana' }; }
}

module.exports = { chat, verifyPaymentScreenshot, clearHistory };
