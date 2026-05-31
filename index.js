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

async function handleTextMessage(psid, text) {
  try {
    const session = getPaymentSession(psid);

    if (session && session.status === 'waiting_screenshot') {
      if (text.toLowerCase().includes('hanova') || text.toLowerCase().includes('hafa')) {
        clearPaymentSession(psid);
        clearHistory(psid);
        await sendTextMessage(psid, 'Tsara! Hanomboka indray. Inona ny logiciel tianao?');
        return;
      }
      await sendTextMessage(psid, 'Miandry ny screenshot confirmation payment aho. Mandefa screenshot azafady.');
      return;
    }

    // Detect buy intent
    const buyIntent = text.toLowerCase().includes('mividy') ||
      text.toLowerCase().includes('buy') ||
      text.toLowerCase().includes('order') ||
      text.toLowerCase().includes('te hividy') ||
      text.toLowerCase().includes('baiko');

    if (buyIntent) {
      const allProducts = getAllProducts();
      const matchedProducts = [];

      for (const p of allProducts) {
        if (text.toLowerCase().includes(p.name.toLowerCase())) {
          matchedProducts.push(p);
        }
      }

      if (matchedProducts.length > 0) {
        const totalAmount = matchedProducts.reduce((sum, p) => sum + p.price, 0);
        const productList = matchedProducts.map(p => `• ${p.name} — ${p.price.toLocaleString()} Ar`).join('\n');

        startPaymentSession(psid, matchedProducts);

        let message = `Tsara! Ireto ny baiko:\n\n${productList}\n\n`;
        if (matchedProducts.length > 1) {
          message += `💰 Total: ${totalAmount.toLocaleString()} Ar\n\n`;
        }
        message += `Alefao ny vola amin'ny:\n💚 MVola: 0344192129 (JHON ROCH TONNY)\n🟠 Orange Money: 0322064574 (JHON ROCH TONNY)\n\nRehefa vita, mandefa screenshot ny confirmation azafady 🙏`;

        await sendTextMessage(psid, message);
        return;
      }
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

  await sendTextMessage(psid, '⏳ Manamarina ny payment... Andraso kely azafady.');
  updatePaymentStatus(psid, 'verifying');

  try {
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

    const result = await verifyPaymentScreenshot(
      imageBase64, contentType, session.amount, session.productName
    );

    if (result.success) {
      // Check reference fraud
      if (result.reference && isReferenceUsed(result.reference)) {
        updatePaymentStatus(psid, 'waiting_screenshot');
        await sendTextMessage(psid, '❌ Efa nampiasaina taloha ilay screenshot. Alefao ny screenshot avy amin\'ny payment vaovao azafady.');
        return;
      }
      markReferenceUsed(result.reference);
      updatePaymentStatus(psid, 'completed');

      // Mandefa download links rehetra
      let successMsg = `✅ Voamarina ny payment! Misaotra tompoko! 🎉\n\n`;

      for (const product of session.products) {
        const token = createDownloadToken(product.id, psid);
        const downloadUrl = `${BASE_URL}/download?token=${token}`;
        successMsg += `📥 ${product.name}:\n👉 ${downloadUrl}\n\n`;
      }

      successMsg += `⚠️ Ity lien de téléchargement omeko anao ity dia tsy miasa afaka 3 andro ka téléchargeô haingana mba tsy ho expiré!`;

      await sendTextMessage(psid, successMsg);
      clearPaymentSession(psid);
      clearHistory(psid);

    } else {
      const attempts = incrementAttempts(psid);
      updatePaymentStatus(psid, 'waiting_screenshot');

      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        clearPaymentSession(psid);
        await sendTextMessage(psid, `❌ Tsy afaka nanamarina ny payment aorian'ny fandramana ${MAX_PAYMENT_ATTEMPTS} indray. Mifandraisa amin'ny admin: 📱 0322064574`);
        return;
      }

      await sendTextMessage(psid, `❌ Tsy voamarina ny payment: ${result.reason || 'Tsy mazava ny screenshot'}.\n\n• Tokony ho ${session.amount.toLocaleString()} Ar\n• Alefa screenshot mazava\n• Fandramana ${attempts}/${MAX_PAYMENT_ATTEMPTS}\n\nAndrama indray azafady 🙏`);
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
      FB_PAGE_ACCESS_TOKEN: process.env.FB_PAGE_ACCESS_TOKEN ? '✅' : '❌',
      FB_VERIFY_TOKEN: process.env.FB_VERIFY_TOKEN ? '✅' : '❌',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? '✅' : '❌',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✅' : '❌',
      BASE_URL: process.env.BASE_URL || '❌',
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Miasa amin'ny port ${PORT}`));
