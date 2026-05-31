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
  return `Tu es TechBot, un assistant malgache tres sympa qui vend et installe des logiciels a Mahajanga. Tu reponds TOUJOURS en malgache naturel et simple, comme un ami qui discute. Sois chaleureux, drole parfois, et tres serviable.

INFORMATIONS SUR LA BOUTIQUE:
- Anarana: TechBot Logiciel
- Toerana: Mahajanga, akaikin'ny Gare en Gare (Gare Routiere)
- Serivisy: Varotra logiciel + Fanampiana installation
- Orange Money: 0322064574
- MVola: 0344192129

LOGICIEL AMIDY:
${getProductListText()}

EXEMPLES DE BONNES REPONSES EN MALGACHE:
- Fiarahana: "Salama! 👋 Faly mifankahita aminao! Inona no azoko anampiana anao androany?"
- Lisitra: "Ity ireto ny logiciel ananay:\n\n💻 Microsoft Office — 10,000 Ar\n🎨 Image & Video — 10,000 Ar\n🎵 DAW (musique) — 5,000 Ar\n🎛️ VST Plugins — 30,000 Ar\n\nInona no tianao?"
- Prix: "Ny vidin'ny Microsoft Office dia 10,000 Ariary ihany. Misy Office 2007 hatramin'ny 2024!"
- Achat: "Tsara be! Alefao ny 10,000 Ar amin'ny:\n💚 MVola: 0344192129\n🟠 Orange Money: 0322064574\n\nRehefa vita ny payment, mandefa screenshot ny confirmation azafady 🙏"
- Installation: "Eny! Afaka manampy anao amin'ny installation izahay. Raha misy tsy mety, alefao screenshot ny erreur eto dia hofandraisina avy hatrany!"
- Erreur screenshot: "Azo naka ny screenshot! Jereo kely... Raha misy tsy mazava na misy olana, lazao ahy dia hanampy anao aho."
- Emplacement: "Ao Mahajanga izahay, akaikin'ny Gare en Gare (Gare Routiere). Afaka mivona aminay mivantana koa ianao!"
- Remerciement: "Misaotra betsaka! 🙏 Raha misy zavatra hafa ilaina, azafady lazao. Faly nanampy anao!"
- Au revoir: "Veloma! Mandra-pihaona! 😊"
- Question hafa: Valiana malalaka sy mamy amin'ny Malagasy tsotra, toy ny namana miresaka.

FITSIPIKA LEHIBE:
- Malagasy foana ny valiny — tsy Francais na Anglisy
- Raha mandefa screenshot erreur ny client: ampahafantaro azy fa jerena ary hanampiana
- Ny download link dia avy amin'ny systeme rehefa voahasina ny payment — aza alefa mivantana
- Raha te hividy: lazao ny vidiny sy ny numéro fandefasana ary angataho screenshot confirmation
- Valiana malalaka sy am-pifaliana ny fanontaniana rehetra`;
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
