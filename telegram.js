const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Mahazo download URL avy amin'ny file_id Telegram
async function getTelegramFileUrl(fileId) {
  try {
    const res = await axios.get(`${BASE_URL}/getFile`, {
      params: { file_id: fileId },
    });
    const filePath = res.data.result.file_path;
    return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
  } catch (err) {
    console.error('[Telegram] Tsy afaka mahazo file URL:', err.message);
    throw new Error('Tsy afaka mahazo ny fichier');
  }
}

// Mandefa fichier mivantana amin'ny chat Telegram (test)
async function sendFileToChatId(chatId, fileId) {
  try {
    await axios.post(`${BASE_URL}/sendDocument`, {
      chat_id: chatId,
      document: fileId,
    });
  } catch (err) {
    console.error('[Telegram] Tsy afaka mandefa fichier:', err.message);
  }
}

module.exports = { getTelegramFileUrl, sendFileToChatId };
