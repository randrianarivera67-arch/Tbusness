# Messenger Bot — Fivarotana Logiciel Automatique

## Architecture
- **Facebook Messenger** — toerana iresan'ny client
- **Claude API** — saina + vérification screenshot payment
- **Telegram Bot** — fitahirizana fichier logiciel
- **Express Backend** — foibe + one-time download tokens

## Fametrahana

### 1. Clone sy Install
```bash
npm install
cp .env.example .env
```

### 2. Fenoy ny .env
```
FB_PAGE_ACCESS_TOKEN=    # avy amin'ny Facebook Developer Console
FB_VERIFY_TOKEN=         # teny malalaka (ohatra: my_secret_123)
ANTHROPIC_API_KEY=       # avy amin'ny console.anthropic.com
TELEGRAM_BOT_TOKEN=      # avy amin'ny @BotFather Telegram
BASE_URL=                # URL Render anao (https://xxx.onrender.com)
```

### 3. Ampidiro ny logiciel ao Telegram
1. Sokafy ny bot Telegram anao
2. Mandefa ny fichier logiciel (APK, ZIP, sns)
3. Forward ilay message ka jereo ny file_id (ampiasao getUpdates)
4. Ampidiro ao amin'ny `products.js` ilay file_id

### Fomba mahazo file_id:
```
GET https://api.telegram.org/bot<TOKEN>/getUpdates
```
Jereo ny `message.document.file_id` ao amin'ny valiny.

### 4. Amboary ny products.js
```js
{
  id: 'prod_1',
  name: 'Anarana Logiciel',
  description: 'Famaritana',
  price: 25000,           // Ariary
  telegramFileId: 'xxx',  // file_id avy Telegram
}
```

### 5. Deploy amin'ny Render
1. Push ny code any GitHub
2. Mamorona Web Service vaovao ao Render
3. Ampidiro ny env variables rehetra
4. Hahazo URL (https://xxx.onrender.com)

### 6. Facebook Webhook
1. Facebook Developer Console → Messenger → Webhooks
2. Callback URL: `https://xxx.onrender.com/webhook`
3. Verify Token: ilay FB_VERIFY_TOKEN ao .env
4. Subscribe: `messages`, `messaging_postbacks`

## Flow Payment
```
Client: "Mividy Logiciel A"
  → Bot: Vidiny + numéro fandefasana
  → Client: mandoa MVola/OrangeMoney
  → Client: mandefa screenshot
  → Claude Vision: manamarina montant + validity
  → Raha OK: one-time link (24 ora) alefa
  → Client: mampiditra, fichier avy Telegram
```

## Fiarovana
- One-time token: miasa indray mandeha fotsiny
- Maty aorian'ny 24 ora
- Fandramana 3 indray maximum raha screenshot diso
- Reference transaction voatahiry (tsy azo ampiasaina roa)
