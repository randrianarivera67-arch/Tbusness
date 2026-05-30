require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { chat, verifyPaymentScreenshot, clearHistory } = require('./claude');
const { sendTextMessage, sendQuickReplies } = require('./messenger');
const { getProductByName, getAllProducts, getProductById } = require('./products');
const { startPaymentSession, getPaymentSession, updatePaymentStatus, clearPaymentSession, incrementAttempts } = require('./payments');
const { createDownloadToken, validateAndConsumeToken } = require('./tokens');
const { getTelegramFileUrl } = require('./telegram');

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_verify_token_123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MAX_PAYMENT_ATTEMPTS = 3;

// ─── Facebook Webhook Verification ───────────────────────────────────────────
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

// ─── Facebook Webhook Events ──────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  res.sendStatus(200); // Valiana haingana Facebook

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const psid = event.sender.id;

      // Message avy amin'ny client
      if (event.message) {
        // Sary (screenshot payment)
        if (event.message.attachments) {
          const imageAttachment = event.message.attachments.find(
            (a) => a.type === 'image'
          );
          if (imageAttachment) {
            await handlePaymentScreenshot(psid, imageAttachment.payload.url);
            continue;
          }
        }

        // Texte
        if (event.message.text) {
          await handleTextMessage(psid, event.message.text);
        }
      }

      // Postback (bouton clicked)
      if (event.postback) {
        await handleTextMessage(psid, event.postback.payload);
      }
    }
  }
});

// ─── Handler: Text Message ────────────────────────────────────────────────────
async function handleTextMessage(psid, text) {
  try {
    const session = getPaymentSession(psid);

    // Raha miandry screenshot ny session fa mandefa texte
    if (session && session.status === 'waiting_screenshot') {
      // Jereo raha mangataka hanova logiciel
      if (text.toLowerCase().includes('hanova') || text.toLowerCase().includes('hafa')) {
        clearPaymentSession(psid);
        clearHistory(psid);
        await sendTextMessage(psid, 'Tsara! Hanomboka indray. Inona ny logiciel tianao?');
        return;
      }
      await sendTextMessage(
        psid,
        'Miandry ny screenshot confirmation payment aho. Raha tsy mbola vita ny payment, azonao atao izany aloha, ary mandefa screenshot avy eo.'
      );
      return;
    }

    // Jereo raha misy logiciel voatondro sy te hividy
    const buyIntent =
      text.toLowerCase().includes('mividy') ||
      text.toLowerCase().includes('buy') ||
      text.toLowerCase().includes('order') ||
      text.toLowerCase().includes('baiko');

    if (buyIntent) {
      // Hikaroka logiciel ao amin'ny message
      const allProducts = getAllProducts();
      let matchedProduct = null;
      for (const p of allProducts) {
        if (text.toLowerCase().includes(p.name.toLowerCase())) {
          matchedProduct = p;
          break;
        }
      }

      if (matchedProduct) {
        startPaymentSession(psid, matchedProduct.id, matchedProduct.name, matchedProduct.price);
        await sendTextMessage(
          psid,
          `Tsara! ${matchedProduct.name} — ${matchedProduct.price.toLocaleString()} Ar.\n\n` +
          `Alefaso ny payment amin'ny:\n` +
          `💚 MVola: 034 XX XXX XX\n` +
          `🟠 Orange Money: 032 XX XXX XX\n\n` +
          `Rehefa vita, mandefa screenshot ny confirmation azafady. Miandry aho! 🙏`
        );
        return;
      }
    }

    // Default: Claude no miresaka
    const reply = await chat(psid, text);

    // Jereo raha namaly Claude hoe mividy (detect product mention)
    const allProducts = getAllProducts();
    for (const p of allProducts) {
      if (reply.toLowerCase().includes(p.name.toLowerCase()) && buyIntent) {
        startPaymentSession(psid, p.id, p.name, p.price);
        break;
      }
    }

    await sendTextMessage(psid, reply);
  } catch (err) {
    console.error('[handleTextMessage] Error:', err.message);
    await sendTextMessage(psid, 'Miala tsiny, nisy olana kely. Andramo indray azafady.');
  }
}

// ─── Handler: Payment Screenshot ─────────────────────────────────────────────
async function handlePaymentScreenshot(psid, imageUrl) {
  const session = getPaymentSession(psid);

  if (!session) {
    // Tsy misy session payment — Claude no mamaly
    const reply = await chat(psid, '[Mpanjifa nandefasa sary]');
    await sendTextMessage(psid, reply);
    return;
  }

  await sendTextMessage(psid, '⏳ Manamarina ny payment... Andraso kely azafady.');
  updatePaymentStatus(psid, 'verifying');

  try {
    // Alaina ny sary amin'ny URL Facebook
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

    // Claude Vision manamarina
    const product = getProductById(session.productId);
    const result = await verifyPaymentScreenshot(
      imageBase64,
      contentType,
      session.amount,
      session.productName
    );

    if (result.success) {
      // ✅ Payment voahasina — mamorona token download
      updatePaymentStatus(psid, 'completed');
      const token = createDownloadToken(session.productId, psid);
      const downloadUrl = `${BASE_URL}/download?token=${token}`;

      await sendTextMessage(
        psid,
        `✅ Voahasina ny payment! Misaotra tompoko! 🎉\n\n` +
        `Ity ny rohy fandownloading ny ${session.productName}:\n` +
        `👇 ${downloadUrl}\n\n` +
        `⚠️ Miasa indray mandeha fotsiny ity rohy ity ary maty ao anatin'ny 24 ora.`
      );

      clearPaymentSession(psid);
      clearHistory(psid);
    } else {
      // ❌ Payment tsy voahasina
      const attempts = incrementAttempts(psid);
      updatePaymentStatus(psid, 'waiting_screenshot');

      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        clearPaymentSession(psid);
        await sendTextMessage(
          psid,
          `❌ Tsy afaka nanamarina ny payment isika aorian'ny fandramana ${MAX_PAYMENT_ATTEMPTS} indray.\n\n` +
          `Azafady mifandraisa amin'ny admin mivantana. Miala tsiny amin'ny fahasahiranana.`
        );
        return;
      }

      await sendTextMessage(
        psid,
        `❌ Tsy voahasina ny payment: ${result.reason || 'Tsy mazava ny screenshot'}.\n\n` +
        `Azafady:\n` +
        `• Jereo raha marina ny montant (${session.amount.toLocaleString()} Ar)\n` +
        `• Alefa screenshot mazava ny confirmation SMS/app\n` +
        `• Fandramana ${attempts}/${MAX_PAYMENT_ATTEMPTS}\n\n` +
        `Andrama indray azafady. 🙏`
      );
    }
  } catch (err) {
    console.error('[handlePaymentScreenshot] Error:', err.message);
    updatePaymentStatus(psid, 'waiting_screenshot');
    await sendTextMessage(
      psid,
      'Nisy olana teknika. Andrama indray ny mandefa screenshot azafady.'
    );
  }
}

// ─── Download Endpoint ────────────────────────────────────────────────────────
app.get('/download', async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).send('Token tsy misy.');

  const result = validateAndConsumeToken(token);
  if (!result.valid) {
    return res.status(403).send(`Tsy azo ampiasaina: ${result.reason}`);
  }

  const product = getProductById(result.productId);
  if (!product) return res.status(404).send('Logiciel tsy hita.');

  try {
    // Mahazo URL vonjimaika avy amin'ny Telegram
    const fileUrl = await getTelegramFileUrl(product.telegramFileId);

    // Redirect mivantana amin'ny fichier Telegram
    res.redirect(fileUrl);
  } catch (err) {
    console.error('[Download] Error:', err.message);
    res.status(500).send('Tsy afaka mahazo ny fichier. Mifandraisa amin\'ny admin.');
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Bot miasa tsara!' }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Miasa amin'ny port ${PORT}`));
