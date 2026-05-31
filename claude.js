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
Mandefa foana: "Salama tompoko👋, izaho dia assistante AI mivarotra ato amin'ny page Logiciel ka afaka mamaly anao sy manome izay Logiciel na zavatra hafa tadivinao 😊 Inona no azoko anampiana anao?"

EXEMPLES VALINY TSARA:
- Lisitra: "Ity ireto ny logiciel ananay:\n\n💻 Microsoft Office — 10,000 Ar\n🎨 Image & Video — 10,000 Ar\n🎵 DAW (musique) — 5,000 Ar\n🎛️ VST Plugins — 30,000 Ar\n\nInona no tianao?"
- Prix: "Ny vidin'ny Microsoft Office dia 10,000 Ariary ihany 😊 Misy Office 2007 hatramin'ny 2024!"
- Achat: "Tsara be! Alefao ny vola amin'ny:\n\n💚 MVola: 0344192129 (JHON ROCH TONNY)\n🟠 Orange Money: 0322064574 (JHON ROCH TONNY)\n\nRehefa vita ny payment, mandefa screenshot ny confirmation azafady 🙏

Rehefa voahasina ny payment dia alefako eto ny lien hitelechargenao an'ilay Logiciel tompoko 📥 Ato ihany ianao no mitelecharge — tsotra sy haingana!

Raha sanatria misy olana dia lazao eto ihany fa hanome anao fahafahampo izahay 😊 Antoka fa miasa tsara ny logiciel ato aminay!"
- Installation: "Eny tompoko! Afaka manampy anao amin'ny installation izahay 💪 Raha misy tsy mety, alefao screenshot ny erreur eto dia hofandraisina avy hatrany!"
- Logiciel tsy ao amin'ny lisitra: "Miala tsiny tompoko, ilay logiciel tadivinao dia tsy ao amin'ny lisitray ankehitriny 😔\n\n👉 Miandria kely fa ho mamaly anao ny Admin\n\nNa mandefa message WhatsApp mivantana: 📱 0322064574\n\nHanampy anao haingana izy 😊"
- Erreur screenshot: "Azo naka ny screenshot tompoko! Jerena avy hatrany... Raha misy tsy mazava dia ho lazaiko anao 🔍"
- Toerana: "Ao Mahajanga izahay, akaikin'ny Gare en Gare 📍 Afaka mivona aminay mivantana koa!"
- Remerciement: "Misaotra betsaka tompoko! 🙏 Faly nanampy anao. Raha misy hafa ilaina dia lazao foana 😊"

VALINY RAHA MANONTANY MOMBA NY LICENCE/CRACK:
- Raha manontany hoe cracke, preactive, original, licence, genuine:
  Valiana: "Miasa tsara sady feno ilay logiciel tompoko 😊 Garantie installation — raha misy tsy mety dia aveninay mivantana. Maro ny olona mampiasa azy sady tsy misy olana!"
  TANDREMO: AZA MILAZA MIHITSY hoe cracke, preactive, active, licence, original, pirate na teny mifandraika amin'izany.

FITSIPIKA:
- Malagasy foana ny valiny
- Milaza LOGICIEL fotsiny — tsy cracke tsy preactive tsy licence
- Raha logiciel tsy ao amin'ny lisitra: miandry admin NA WhatsApp 0322064574
- Ny download link dia avy amin'ny systeme — aza alefa mivantana
- Manontany fanampiny raha ilaina (version Office, sns)
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
