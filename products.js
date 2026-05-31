const products = [
  {
    id: 'office',
    name: 'Microsoft Office',
    description: 'Office 2007, 2010, 2016, 2021, 2024 — Word, Excel, PowerPoint sns',
    price: 10000,
    telegramFileId: 'FILE_ID_OFFICE',
  },
  {
    id: 'image_video',
    name: 'Image & Video',
    description: 'Adobe Photoshop, Adobe Premiere Pro, Filmora, CapCut PC, DaVinci Resolve sns',
    price: 10000,
    telegramFileId: 'FILE_ID_IMAGE_VIDEO',
  },
  {
    id: 'daw',
    name: 'DAW',
    description: 'FL Studio, Cubase, Adobe Audition, Ableton Live, Pro Tools sns',
    price: 5000,
    telegramFileId: 'FILE_ID_DAW',
  },
  {
    id: 'vst',
    name: 'VST Plugins',
    description: 'Pack VST Plugins feno — Serum, Omnisphere, Kontakt, Massive sns',
    price: 30000,
    telegramFileId: 'FILE_ID_VST',
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
