require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { chat, verifyPaymentScreenshot, clearHistory } = require('./claude');
const { sendTextMessage } = require('./messenger');
const { getProductByName, getAllProducts, getProductById } = require('./products');
const { startPaymentSession, getPaymentSession, updatePaymentStatus, clearPaymentSession, incrementAttempts, isReferenceUsed, markReferenceUsed } = require('./payments');
const { createDownloadToken, validateAndConsumeToken } = require('./tokens');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_verify_token_123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_PAYMENT_ATTEMPTS = 3;

// Keep-alive
setInterval(() => {
  require('axios').get(BASE_URL).catch(() => {});
  console.log('[Keep-alive] Ping!');
}, 4 * 60 * 1000);

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Verified!');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Webhook messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);
  console.log('[WEBHOOK] Message tonga!');
  res.sendStatus(200);

  for (const entry of body.entry || []) {
    // Comments
    for (const change of entry.changes || []) {
      if (change.field === 'feed' && change.value?.item === 'comment' && change.value?.verb === 'add') {
        const val = change.value;
        const userId = val.from?.id;
        const userName = val.from?.name || 'tompoko';
        const commentId = val.comment_id;
        if (userId && commentId && userId !== entry.id) {
          await handleComment(userId, userName, commentId, val.message || '');
        }
      }
    }

    // Messages
    for (const event of entry.messaging || []) {
      const psid = event.sender.id;
      if (event.message) {
        if (event.message.attachments) {
          const imageAttachment = event.message.attachments.find(a => a.type === 'image');
          if (imageAttachment) {
            await handlePaymentScreenshot(psid, imageAttachment.payload.url);
            continue;
          }
        }
        if (event.message.text) {
          await handleTextMessage(psid, event.message.text);
        }
      }
      if (event.postback) {
        await handleTextMessage(psid, event.postback.payload);
      }
    }
  }
});

// Comment handler
async function handleComment(userId, userName, commentId, commentText) {
  try {
    const allProducts = getAllProducts();
    const productFound = allProducts.find(p =>
      commentText.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
    );
    await axios.post(
      `https://graph.facebook.com/v19.0/${commentId}/comments`,
      { message: productFound ? `Eny tompoko, misy ${productFound.name} 😊 MP any!` : 'Salama tompoko 👋 MP any mba hahafantaranao bebe kokoa 😊' },
      { params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN } }
    );
    await sendTextMessage(userId, `Salama tompoko ${userName}! 👋 Inona ny logiciel tadiavinao?`);
  } catch (err) {
    console.error('[Comment] Error:', err.message);
  }
}

// Text message handler
async function handleTextMessage(psid, text) {
  try {
    const session = await getPaymentSession(psid);

    if (session && session.status === 'waiting_screenshot') {
      await sendTextMessage(psid, 'Miandry ny screenshot confirmation payment aho. Mandefa screenshot azafady 🙏');
      return;
    }

    if (text.toLowerCase() === 'reset' || text.toLowerCase() === '/reset') {
      clearHistory(psid);
      await clearPaymentSession(psid);
      await sendTextMessage(psid, 'Salama tompoko! Manomboka resaka vaovao 😊');
      return;
    }

    const result = await chat(psid, text);
    // Esorina ny BUY signal amin'ny text alefa
    const cleanText = result.text.replace(/\[\[BUY:[^\]]+\]\]/g, '').trim();
    // Esorina ny character tsy UTF-8
    const safeText = Buffer.from(cleanText).toString('utf8').replace(/\uFFFD/g, '');
    await sendTextMessage(psid, safeText || 'Misaotra tompoko! 😊');

    // Detect BUY signal
    const buySignals = [...result.text.matchAll(/\[\[BUY:([^:]+):(\d+)\]\]/g)];
    if (buySignals.length > 0) {
      const products = [];
      for (const signal of buySignals) {
        const product = getProductById(signal[1]);
        if (product) products.push(product);
      }
      if (products.length > 0) {
        await startPaymentSession(psid, products);
        console.log('[Payment] Session atomboky:', products.map(p => p.name).join(' + '));
      }
    } else {
      // Fallback: raha Groq nilaza MVola/Orange Money fa tsy nametraka signal
      const hasMvola = result.text.includes('0344192129') || result.text.includes('0322064574');
      if (hasMvola) {
        const allProducts = getAllProducts();
        const mentionedProduct = allProducts.find(p =>
          result.text.toLowerCase().includes(p.name.toLowerCase().split(' ')[0].toLowerCase())
        );
        if (mentionedProduct) {
          await startPaymentSession(psid, [mentionedProduct]);
          console.log('[Payment] Fallback session:', mentionedProduct.name);
        }
      }
    }
  } catch (err) {
    console.error('[handleTextMessage] Error:', err.message);
    await sendTextMessage(psid, 'Miala tsiny, nisy olana kely. Andramo indray azafady.');
  }
}

// Screenshot payment handler
async function handlePaymentScreenshot(psid, imageUrl) {
  const session = await getPaymentSession(psid);
  if (!session) {
    await sendTextMessage(psid, 'Misaotra tompoko! Nefa tsy mbola nifidy logiciel ianao. Lazao ahy aloha ny logiciel tadiavinao 😊');
    return;
  }

  await sendTextMessage(psid, 'Manamarina ny payment... Andraso kely azafady 🔍');

  try {
    // Download ny sary
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

    const result = await verifyPaymentScreenshot(imageBase64, contentType, session.amount, session.productName);
    console.log('[Payment] Verification result:', JSON.stringify(result));

    if (result.success && result.amount >= session.amount) {
      // Jereo raha efa nampiasaina ilay reference
      if (result.reference && isReferenceUsed(result.reference)) {
        await updatePaymentStatus(psid, 'waiting_screenshot');
        await sendTextMessage(psid, 'Efa nampiasaina taloha ilay screenshot. Alefao ny screenshot vaovao azafady 🙏');
        return;
      }
      markReferenceUsed(result.reference);
      await updatePaymentStatus(psid, 'completed');

      // Mandefa lien download
      let successMsg = 'Voamarina ny payment! Misaotra tompoko! 🎉\n\n';
      for (const product of session.products) {
        const token = await createDownloadToken(product.id, psid);
        const downloadUrl = `${BASE_URL}/download?token=${token}`;
        successMsg += `${product.name}:\n${downloadUrl}\n\n`;
      }
      successMsg += 'Ity lien ity dia miasa 72 ora — telecharge haingana! ⏰';
      await sendTextMessage(psid, successMsg);
      await clearPaymentSession(psid);
      clearHistory(psid);

    } else if (result.success && result.amount < session.amount) {
      // Vola tsy ampy
      const attempts = await incrementAttempts(psid);
      await updatePaymentStatus(psid, 'waiting_screenshot');
      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        await clearPaymentSession(psid);
        await sendTextMessage(psid, 'Tsy afaka nanamarina ny payment. Mifandraisa amin\'ny admin: +261 32 206 4574 📲');
        return;
      }
      await sendTextMessage(psid, `Miala tsiny tompoko, tsy ampy ny vola alefana 😔 Nalefa ${result.amount.toLocaleString()} Ar fa tokony ho ${session.amount.toLocaleString()} Ar. Alefao indray ny tena vola marina 🙏`);

    } else {
      // Screenshot tsy mazava
      const attempts = await incrementAttempts(psid);
      await updatePaymentStatus(psid, 'waiting_screenshot');
      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        await clearPaymentSession(psid);
        await sendTextMessage(psid, 'Tsy afaka nanamarina ny payment. Mifandraisa amin\'ny admin: +261 32 206 4574 📲');
        return;
      }
      await sendTextMessage(psid, `Tsy azonay vakiana tsara ny screenshot 😔 Alefao indray sary mazava kokoa. Fandramana ${attempts}/${MAX_PAYMENT_ATTEMPTS}`);
    }

  } catch (err) {
    console.error('[handlePaymentScreenshot] Error:', err.message);
    await updatePaymentStatus(psid, 'waiting_screenshot');
    await sendTextMessage(psid, 'Nisy olana teknika. Andrama indray ny mandefa screenshot azafady.');
  }
}

// Download endpoint
app.get('/download', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token tsy misy.');
  const result = await validateAndConsumeToken(token);
  if (!result.valid) return res.status(403).send(`Tsy azo ampiasaina: ${result.reason}`);
  const product = getProductById(result.productId);
  if (!product) return res.status(404).send('Logiciel tsy hita.');
  if (!product.downloadUrl) return res.status(404).send('Fichier tsy hita.');
  res.redirect(product.downloadUrl);
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Bot miasa! 🤖', version: '2.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Miasa amin-dRahalah port ${PORT}`));
