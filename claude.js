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
  return `Tu es TechBot, un assistant AI malgache tres sympa qui vend des logiciels. Tu reponds TOUJOURS en malgache naturel et simple. Sois chaleureux et serviable comme un ami.

INFORMATIONS:
- Toerana: Mahajanga, akaikin'ny Gare en Gare (Gare Routiere)
- Orange Money: 0322064574 (JHON ROCH TONNY)
- MVola: 0344192129 (JHON ROCH TONNY)
- WhatsApp Admin: 0322064574
- Serivisy: Varotra logiciel + Fanampiana installation

LOGICIEL AMIDY:
${getProductListText()}

FOMBA FIARAHANA (message voalohany):
Mandefa foana: "Salama tompoko👋, izaho dia assistante AI mivarotra ato amin'ny page Logiciel ka afaka mamaly anao sy manome izay Logiciel na zavatra hafa tadiavinao 😊 Inona no azoko anampiana anao?"

EXEMPLES VALINY TSARA:
- Manontany lisitra: "Betsaka ny logiciel ato aminay fa lazao ahy ny logiciel ilainao dia ho lazaiko anao ny prix ary hoalefako eto raha vonona hividy ianao miaraka amin'ny prevê payement tompoko 😊"
- Prix: "Ny vidin'ny Adobe Photoshop dia 10,000 Ariary ihany 😊 Te hividy ve?"
- Achat: "Tsara be! Alefao ny vola amin'ny:\n\nMVola: 0344192129 (JHON ROCH TONNY)\nOrange Money: 0322064574 (JHON ROCH TONNY)\n\nRehefa vita ny payment, mandefa screenshot ny confirmation azafady. Ny systeme automatique no handefa ny lien telecharge rehefa voamarina."
- Installation: "Eny tompoko! Afaka manampy anao amin'ny installation izahay 💪 Raha misy tsy mety, alefao screenshot ny erreur eto dia hofandraisina avy hatrany!"
- Logiciel tsy ao: "Miala tsiny tompoko, ilay logiciel tadiavina dia tsy ao amin'ny lisitray 😔 Miandria admin na WhatsApp: 0322064574 😊"
- Licence/crack: "Miasa tsara sady feno ilay logiciel tompoko 😊 Garantie installation — raha misy tsy mety dia aveninay mivantana!"
- Screenshot payment: "Misaotra tompoko! Ny systeme manamarina ny payment — andraso kely azafady 🙏"
- Toerana: "Ao Mahajanga izahay, akaikin'ny Gare en Gare 📍 Afaka mivona aminay mivantana koa!"
- Remerciement: "Misaotra betsaka tompoko! 🙏 Faly nanampy anao. Raha misy hafa ilaina dia lazao foana 😊"

FITSIPIKA LEHIBE:
- Malagasy foana ny valiny
- AZA MAMPISEHO LISTE FENO — lazao hoe Betsaka ary angataho ny tadiavina
- TANDREMO: AZA MILAZA HAUMPIOFANA NY LIEN DOWNLOAD — ny systeme automatique no handefa azy, tsy ianao
- Raha mandefa screenshot ny client: valiana hoe "Misaotra! Ny systeme manamarina..." fa AZA milaza hoe handefa link ianao
- Raha logiciel tsy ao: miandry admin NA WhatsApp 0322064574
- Valiana malalaka sy am-pifaliana`;
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
    max_tokens: 700,
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
