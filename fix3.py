content = open('index.js').read()

old = """    const buyIntent = text.toLowerCase().includes('mividy') ||
      text.toLowerCase().includes('hividy') ||
      text.toLowerCase().includes('mba maka') ||
      text.toLowerCase().includes('liana') ||
      text.toLowerCase().includes('vidy firy') ||
      text.toLowerCase().includes('prix') ||
      text.toLowerCase().includes('buy') ||
      text.toLowerCase().includes('order') ||
      text.toLowerCase().includes('acheter') ||
      text.toLowerCase().includes('combien') ||
      text.toLowerCase().includes('baiko') ||
      text.toLowerCase().includes('order');

    if (buyIntent) {
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
          `Tsara! ${matchedProduct.name} — ${matchedProduct.price.toLocaleString()} Ar.\\n\\n` +
          `Alefaso ny payment amin'ny:\\n` +
          `💚 MVola: 034 XX XXX XX\\n` +
          `🟠 Orange Money: 032 XX XXX XX\\n\\n` +
          `Rehefa vita, mandefa screenshot ny confirmation azafady. Miandry aho! 🙏`
        );
        return;
      }
    }"""

new = """    // Groq mihitsy no mamaly — tsy mila keyword detection"""

content = content.replace(old, new)
open('index.js', 'w').write(content)
print('Vita!' if old in open('index.js').read() == False else 'Vita!')
