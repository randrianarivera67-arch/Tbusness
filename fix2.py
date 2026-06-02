content = open('index.js').read()
old = """    const buyIntent = text.toLowerCase().includes('mividy') ||
      text.toLowerCase().includes('buy') ||
      text.toLowerCase().includes('order') ||"""
new = """    const buyIntent = text.toLowerCase().includes('mividy') ||
      text.toLowerCase().includes('hividy') ||
      text.toLowerCase().includes('mba maka') ||
      text.toLowerCase().includes('liana') ||
      text.toLowerCase().includes('vidy firy') ||
      text.toLowerCase().includes('prix') ||
      text.toLowerCase().includes('buy') ||
      text.toLowerCase().includes('order') ||
      text.toLowerCase().includes('acheter') ||
      text.toLowerCase().includes('combien') ||"""
content = content.replace(old, new)
open('index.js', 'w').write(content)
print('Vita!')
