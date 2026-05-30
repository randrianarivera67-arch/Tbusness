const Anthropic = require('@anthropic-ai/sdk');
const { getProductListText } = require('./products');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Conversation history per user (psid -> messages[])
const conversationHistory = new Map();

function getHistory(psid) {
  if (!conversationHistory.has(psid)) conversationHistory.set(psid, []);
  return conversationHistory.get(psid);
}

function clearHistory(psid) {
  conversationHistory.set(psid, []);
}

const SYSTEM_PROMPT = `Ianao dia bot fivarotana logiciel malagasy. Anaranao: "TechBot".
Miteny Malagasy foana ianao — mazava, mamy, professional.

LOGICIEL AMIDY:
${getProductListText()}

ANDRAIKITRAO:
1. Mampiseho ny lisitry ny logiciel raha manontany ny client
2. Manazava ny tsirairay raha mangataka fanazavana
3. Raha te hividy ilay client, lazao aminy:
   - Ny vidiny marina
   - Ny numéro MVola fandefasana: 034 XX XXX XX (ovay amin'ny tena numéro)
   - Ny numéro Orange Money: 032 XX XXX XX (ovay)
   - Hangataho screenshot confirmation rehefa vita ny payment
4. Raha mandefa screenshot izy, valiana hoe "Misaotra! Manamarina ny payment izahay..."
   ary ny système no hanamarina — aza mangataka hafa intsony.
5. Mora sy tsara fo mandrakariva. Raha tsy fantatrao ny valiny, lazao hoe hifandray amin'ny admin.

DISO ATAO:
- Aza mandefa lien download mivantana (ny système no manao izany)
- Aza manome baiko tsy mifandray amin'ny logiciel
- Aza mandray vola an-tanana
`;

// Chat tsotra (tsy misy image)
async function chat(psid, userMessage) {
  const history = getHistory(psid);
  history.push({ role: 'user', content: userMessage });

  // Fepetra: tsy mihoatra ny 20 messages ny history
  if (history.length > 20) history.splice(0, 2);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const reply = response.content[0].text;
  history.push({ role: 'assistant', content: reply });
  return reply;
}

// Vision: manamarina screenshot payment
async function verifyPaymentScreenshot(imageBase64, mediaType, expectedAmount, productName) {
  const prompt = `Jereo ity screenshot ity. Sary confirmation payment MVola na Orange Money io.

Manamarina ireto:
1. Vita ny famindram-bola ve? (tsy lafo fanaovana, tsy nolà)
2. Firy Ariary ny montant?
3. Misy référence transaction ve?
4. Androany ny daty (na tsy manalavitra)?

Valiana AMIN'NY JSON FOTSINY amin'ity endrika ity:
{
  "success": true/false,
  "amount": <number na null>,
  "reference": "<string na null>",
  "date": "<string na null>",
  "reason": "<raha false, inona no olana>"
}

Raha sary tsy mifandray amin'ny payment: success: false, reason: "Sary tsy mifandray amin'ny payment".
Raha voahasina ny payment ary ny montant = ${expectedAmount} Ar ho an'ny ${productName}: success: true.
Raha tsy mifanaraka ny montant: success: false.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  try {
    const text = response.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch {
    return { success: false, reason: 'Tsy afaka mamaky ny valim-panamarinana' };
  }
}

module.exports = { chat, verifyPaymentScreenshot, clearHistory };
