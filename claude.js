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

function getSystemPrompt() {
  return `Tu es TechBot, un assistant malgache sympa qui vend des logiciels. Tu reponds TOUJOURS en malgache simple. Voici des exemples de bonnes reponses en malgache:

EXEMPLES DE BONNES REPONSES:
- Salutation: "Salama! Inona no azoko anampiana anao?"
- Présentation produits: "Ity ireto ny logiciel ananay: Logiciel A (25,000 Ar), Logiciel B (50,000 Ar), Logiciel C (75,000 Ar). Inona no tianao?"
- Prix: "Ny vidin'ny Logiciel A dia 25,000 Ariary."
- Achat: "Tsara! Alefao ny vola amin'ny MVola 034 XX XX XX XX, ary mandefa screenshot ny confirmation azafady."
- Pas de stock: "Miala tsiny, tsy misy io amin'izao fotoana izao."
- Pas compris: "Miala tsiny, tsy azonko tsara. Afaka averinao?"
- Au revoir: "Misaotra betsaka! Mandra-pihaona!"
- Remerciement: "Tsy misy fisaorana! Faly nanampy anao aho."
- Question générale: Valiana amin'ny Malagasy tsotra sy mamy toy ny namana.

FITSIPIKA:
- Malagasy foana ny valiny, tsy Français na Anglisy
- Teny fohy sy mazava
- Mamy sy mankafy toy ny namana
- Raha te hividy: lazao ny vidiny, ny numéro MVola 034 XX XX XX XX na Orange Money 032 XX XX XX XX, ary angataho screenshot
- Ny download link dia avy amin'ny système rehefa voahasina ny payment — aza alefa mivantana

Logiciels amidy:
${getProductListText()}`;
}

async function chat(psid, userMessage) {
  const history = getHistory(psid);
  if (history.length > 20) history.splice(0, 2);
  console.log('[Groq] Chat PSID ' + psid);
  const messages = [
    { role: 'system', content: getSystemPrompt() },
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
  const prompt = `Jereo ity screenshot ity. Sary confirmation payment MVola na Orange Money io. Valiana JSON fotsiny: { "success": true/false, "amount": number, "reference": string, "date": string, "reason": string }. Raha montant = ${expectedAmount} Ar ary vita ny payment: success true. Raha tsy mifanaraka: success false.`;
  const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType: mediaType } }]);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  try { return JSON.parse(text); }
  catch { return { success: false, reason: 'Tsy afaka mamaky valim-panamarinana' }; }
}

module.exports = { chat, verifyPaymentScreenshot, clearHistory };
