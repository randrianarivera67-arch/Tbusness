const axios = require('axios');

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GRAPH_URL = 'https://graph.facebook.com/v19.0/me/messages';

// Mandefa message texte
async function sendTextMessage(recipientId, text) {
  try {
    await axios.post(
      GRAPH_URL,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (err) {
    console.error('[Messenger] Tsy afaka mandefa message:', err.response?.data || err.message);
  }
}

// Mandefa message misy bouton
async function sendButtonMessage(recipientId, text, buttons) {
  try {
    await axios.post(
      GRAPH_URL,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons,
            },
          },
        },
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (err) {
    console.error('[Messenger] Tsy afaka mandefa button message:', err.response?.data || err.message);
  }
}

// Mandefa quick replies
async function sendQuickReplies(recipientId, text, quickReplies) {
  try {
    await axios.post(
      GRAPH_URL,
      {
        recipient: { id: recipientId },
        message: {
          text,
          quick_replies: quickReplies.map((label) => ({
            content_type: 'text',
            title: label,
            payload: label.toUpperCase().replace(/\s+/g, '_'),
          })),
        },
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (err) {
    console.error('[Messenger] Tsy afaka mandefa quick replies:', err.response?.data || err.message);
  }
}

// Mahazo URL sary avy amin'ny attachment_id Facebook
async function getFacebookImageUrl(attachmentUrl) {
  // Facebook dia mandefa URL mivantana ao amin'ny webhook
  return attachmentUrl;
}

module.exports = { sendTextMessage, sendButtonMessage, sendQuickReplies, getFacebookImageUrl };
