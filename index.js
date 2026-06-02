require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { chat, verifyPaymentScreenshot, clearHistory, getHistory } = require('./claude');
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
  const url = process.env.BASE_URL || 'http://localhost:3000';
  require('axios').get(url).catch(() => {});
  console.log('[Keep-alive] Ping!');
}, 4 * 60 * 1000);

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

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);
  console.log('[WEBHOOK] Message tonga! entry:', JSON.stringify(body.entry));
  res.sendStatus(200);

  for (const entry of body.entry || []) {
    // Handle comments
    for (const change of entry.changes || []) {
      if (change.field === 'feed' && change.value?.item === 'comment' && change.value?.verb === 'add') {
        const val = change.value;
        const userId = val.from?.id;
        const userName = val.from?.name || 'tompoko';
        const commentId = val.comment_id;
        const commentText = val.message || '';
        if (userId && commentId && userId !== entry.id) {
          await handleComment(userId, userName, commentId, commentText);
        }
      }
    }

    // Handle messages
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

async function replyToComment(commentId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${commentId}/comments`,
      { message },
      { params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN } }
    );
    console.log('[Comment] Valiny nalefa!');
  } catch (err) {
    console.error('[Comment] Error reply:', err.response?.data || err.message);
  }
}

async function handleComment(userId, userName, commentId, commentText) {
  console.log(`[Comment] avy amin-dRahalah ${userName}: ${commentText}`);

  const allProducts = getAllProducts();
  const productFound = allProducts.find(p =>
    commentText.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
  );

  if (productFound) {
    await replyToComment(commentId, `Eny tompoko, misy ${productFound.name} 😊 MP any!`);
  } else {
    await replyToComment(commentId, 'Salama tompoko 👋 MP any mba hahafantaranao bebe kokoa 😊');
  }

  try {
    await sendTextMessage(userId, `Salama tompoko ${userName}! 👋 Nahita ny commentairenao aho 😊 Inona ny logiciel tadiavinao?`);
    console.log('[Comment] DM nalefa!');
  } catch (err) {
    console.error('[Comment] DM error:', err.message);
  }
}

async function handleTextMessage(psid, text) {
  try {
    const session = getPaymentSession(psid);

    if (session && session.status === 'waiting_screenshot') {
      await sendTextMessage(psid, 'Miandry ny screenshot confirmation payment aho. Mandefa screenshot azafady.');
      return;
    }

    if (text.toLowerCase() === 'reset' || text.toLowerCase() === '/reset') {
      clearHistory(psid);
      clearPaymentSession(psid);
      await sendTextMessage(psid, 'Salama tompoko! Manomboka resaka vaovao izahay 😊 Inona no azoko anampiana anao?');
      return;
    }
    // Groq mihitsy no mamaly messages rehetra
    }

    const reply = await chat(psid, text);
    await sendTextMessage(psid, reply);
  } catch (err) {
    console.error('[handleTextMessage] Error:', err.message);
    await sendTextMessage(psid, 'Miala tsiny, nisy olana kely. Andramo indray azafady.');
  }
}

async function handlePaymentScreenshot(psid, imageUrl) {
  const session = getPaymentSession(psid);
  if (!session) {
    const reply = await chat(psid, '[Mpanjifa nandefasa sary]');
    await sendTextMessage(psid, reply);
    return;
  }

  await sendTextMessage(psid, 'Manamarina ny payment... Andraso kely azafady.');
  updatePaymentStatus(psid, 'verifying');

  try {
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

    const result = await verifyPaymentScreenshot(imageBase64, contentType, session.amount, session.productName);

    if (result.success) {
      if (result.reference && isReferenceUsed(result.reference)) {
        updatePaymentStatus(psid, 'waiting_screenshot');
        await sendTextMessage(psid, 'Efa nampiasaina taloha ilay screenshot. Alefao ny screenshot avy amin-dRahalah payment vaovao azafady.');
        return;
      }
      markReferenceUsed(result.reference);
      updatePaymentStatus(psid, 'completed');

      let successMsg = 'Voamarina ny payment! Misaotra tompoko!\n\n';
      for (const product of session.products) {
        const token = createDownloadToken(product.id, psid);
        const downloadUrl = `${BASE_URL}/download?token=${token}`;
        successMsg += `${product.name}:\n${downloadUrl}\n\n`;
      }
      successMsg += 'Ity lien ity dia tsy miasa afaka 3 andro — telecharge haingana!';
      await sendTextMessage(psid, successMsg);
      clearPaymentSession(psid);
      clearHistory(psid);
    } else {
      const attempts = incrementAttempts(psid);
      updatePaymentStatus(psid, 'waiting_screenshot');
      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        clearPaymentSession(psid);
        await sendTextMessage(psid, 'Tsy afaka nanamarina ny payment. Mifandraisa amin-dRahalah admin: 0322064574');
        return;
      }
      await sendTextMessage(psid, `Tsy voamarina ny payment: ${result.reason || 'Tsy mazava ny screenshot'}. Tokony ho ${session.amount.toLocaleString()} Ar. Fandramana ${attempts}/${MAX_PAYMENT_ATTEMPTS}`);
    }
  } catch (err) {
    console.error('[handlePaymentScreenshot] Error:', err.message);
    updatePaymentStatus(psid, 'waiting_screenshot');
    await sendTextMessage(psid, 'Nisy olana teknika. Andrama indray ny mandefa screenshot azafady.');
  }
}

app.get('/download', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token tsy misy.');
  const result = validateAndConsumeToken(token);
  if (!result.valid) return res.status(403).send(`Tsy azo ampiasaina: ${result.reason}`);
  const product = getProductById(result.productId);
  if (!product) return res.status(404).send('Logiciel tsy hita.');
  if (!product.downloadUrl) return res.status(404).send('Fichier tsy hita.');
  res.redirect(product.downloadUrl);
});

app.get('/', (req, res) => {
  res.json({
    status: 'Bot miasa!',
    env: {
      FB_PAGE_ACCESS_TOKEN: process.env.FB_PAGE_ACCESS_TOKEN ? 'OK' : 'MISSING',
      FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN ? 'OK' : 'MISSING',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? 'OK' : 'MISSING',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'OK' : 'MISSING',
      BASE_URL: process.env.BASE_URL || 'MISSING',
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Miasa amin-dRahalah port ${PORT}`));
