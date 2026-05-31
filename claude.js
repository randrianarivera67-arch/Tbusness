const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getProductListText } = require('./products');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const conversationHistory = new Map();

function getHistory(psid) {
  if (!conversationHistory.has(psid)) conversationHistory.set(psid, []);
  return conversationHistory.get(psid);
}

function clearHistory(psid) {
  conversationHistory.set(psid, []);
}

function getSystemPrompt() {
  return `Ianao dia olona iray atao hoe TechBot. Tena olona miresaka ianao, tsy robot. Miteny Malagasy tsotra sy mazava foana ianao. Afaka miresaka momba ny zavatra rehetra ianao toy ny namana. Mpivarotra logiciel koa anefa ianao rehefa ilaina.

Logiciel amidy:
${getProductListText()}

Raha te hividy: lazao ny vidiny sy alefaso ny payment amin'ny MVola 034 XX XXX XX na Orange Money 032 XX XXX XX, ary hangataho screenshot confirmation. Ny download link dia alefa avy amin'ny systeme rehefa voahasina ny payment - aza alefa mivantana. Resaho toy ny namana foana - mamy, mahafinaritra. Raha tsy fantatrao ny valiny dia lazao fa tsy fantatra.`;
}

async function chat(psid, userMessage) {
  const history = getHistory(psid);
  if (history.length > 20) history.splice(0, 2);
  console.log('[Gemini] Chat PSID ' + psid);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: getSystemPrompt()
  });

  const geminiHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }]
  }));

  const chatSession = model.startChat({ history: geminiHistory });
  const result = await chatSession.sendMessage(userMessage);
  const reply = result.response.text();

  console.log('[Gemini] Valiny: ' + reply.substring(0, 80));
  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: reply });
  return reply;
}

async function verifyPaymentScreenshot(imageBase64, mediaType, expectedAmount, productName) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Jereo ity screenshot ity. Sary confirmation payment MVola na Orange Money io. Valiana JSON fotsiny: { "success": true/false, "amount": number, "reference": string, "date": string, "reason": string }. Raha montant = ${expectedAmount} Ar ary vita ny payment: success true. Raha tsy mifanaraka: success false.`;
  const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType: mediaType } }]);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  try { return JSON.parse(text); }
  catch { return { success: false, reason: 'Tsy afaka mamaky valim-panamarinana' }; }
}

module.exports = { chat, verifyPaymentScreenshot, clearHistory };
