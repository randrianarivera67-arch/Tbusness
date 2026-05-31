const products = [
  {
    id: 'office',
    name: 'Microsoft Office',
    description: 'Office 2016 sy 2021 — Word, Excel, PowerPoint, Outlook sns',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/he6lig43ldafrf8/Office_2016-21_C2R_x64_FR_16.0.16130.20306.ISO/file',
  },
  {
    id: 'photoshop',
    name: 'Adobe Photoshop',
    description: 'Adobe Photoshop 2023 v24.5 — Win x64',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/kzoxgpoizbafu08/Adobe_Photoshop_2023_v24.5.0.500_Win_x64_Multi_Pr%25C3%25A9activ%25C3%25A9.rar/file',
  },
  {
    id: 'movavi',
    name: 'Movavi Video Editor',
    description: 'Movavi Video Editor Plus 2025 — Video editing',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/nj6u3hbl8eygm1n/MovaviVideoEditorPlus2025.25.3.0.k_%25281%2529.rar/file',
  },
  {
    id: 'obs',
    name: 'OBS Studio',
    description: 'OBS Studio — Recording sy Live streaming',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/lsp26j309ktkxlr/OBS.rar/file',
  },
  {
    id: 'wirecast',
    name: 'Wirecast',
    description: 'Wirecast 16.5.1 — Live streaming professional',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/97hzuuxk4ppckdi/Wirecast16.5.1.v.rar/file',
  },
  {
    id: 'avs',
    name: 'AVS Video Editor',
    description: 'AVS Video Editor 26 — Video editing',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/4h1en8p11g7vxmr/AVSVideoEditor26.0.2.17.g.rar/file',
  },
  {
    id: 'aomei',
    name: 'AOMEI Partition Assistant',
    description: 'AOMEI Partition Assistant 10.7 — Fitantanana partition',
    price: 10000,
    downloadUrl: 'https://www.mediafire.com/file/hqo3wqlvrvxnyyy/AOMEI_Partition_Assistant_10.7.0_Win_Multi_%252B_Crack.rar/file',
  },
  {
    id: 'glue',
    name: 'VST Plugins',
    description: 'Cytomic The Glue v1.3.12 — Compressor VST plugin',
    price: 30000,
    downloadUrl: 'https://www.mediafire.com/file/styrt7f9c2nvvue/Cytomic_The_Glue_v1.3.12.rar/file',
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
