const products = [
  {
    id: 'prod_1',
    name: 'Logiciel A',
    description: 'Famaritana fohy ny Logiciel A',
    price: 25000,
    telegramFileId: 'FILE_ID_TELEGRAM_A', // ovay amin'ny tena file_id
  },
  {
    id: 'prod_2',
    name: 'Logiciel B',
    description: 'Famaritana fohy ny Logiciel B',
    price: 50000,
    telegramFileId: 'FILE_ID_TELEGRAM_B',
  },
  {
    id: 'prod_3',
    name: 'Logiciel C',
    description: 'Famaritana fohy ny Logiciel C',
    price: 75000,
    telegramFileId: 'FILE_ID_TELEGRAM_C',
  },
];

function getProductById(id) {
  return products.find((p) => p.id === id) || null;
}

function getProductByName(name) {
  return products.find((p) =>
    p.name.toLowerCase().includes(name.toLowerCase())
  ) || null;
}

function getAllProducts() {
  return products;
}

function getProductListText() {
  return products
    .map((p) => `• ${p.name} — ${p.price.toLocaleString()} Ar\n  ${p.description}`)
    .join('\n\n');
}

module.exports = { getProductById, getProductByName, getAllProducts, getProductListText };
