import { db } from '../db/db';
import { EMPTY_SUPPLIER, addPhoto, blankProduct, saveNewProduct } from '../db/repo';
import { currentOwner } from '../services/session';
import type { Product } from '../types/models';

type Demo = Partial<Product> & { key: string; emoji: string; tint: string; daysAgo: number };

const DESCRIPTIONS: Record<string, string> = {
  "sauce": "Countertop dispenser that portions sauces automatically. Interesting for Babel as a B2B test; OEM possible.",
  "camera": "Shelf camera that counts stock and reports gaps. Could plug into Lokka; monthly cloud fee.",
  "packaging": "Compostable take-away box made of sugarcane fibre with a clip lid. Microwave safe, custom logo possible.",
  "feeder": "App-controlled pet feeder with a built-in camera. Crowded Amazon segment; strong around Christmas.",
  "robot": "Six-axis desktop robot arm with a Python SDK. Research and prototyping, not a resale item.",
  "energy": "Plug-in energy monitor with WiFi and app. Useful to track power costs at the kiosk and Babel.",
  "stem": "Electronics learning kit for ages 10 to 14. Own-brand potential around school start.",
  "recovery": "Compact massage gun for recovery. Many similar offers on Amazon.",
  "vending": "Smart vending fridge with weight sensors and card payment. Strong fit for the kiosk; needs fiscal check.",
  "food": "Self-heating rice meal with 12 months shelf life, halal. Interesting for Ramadan and the Syrian market."
};

const DEMOS: Demo[] = [
  {
    key: 'sauce', emoji: '🥫', tint: '#FF4FA3', daysAgo: 0, name: 'Automatic sauce dispenser',
    voiceTranscript: 'Automatischer Soßenspender, interessant für Babel, ca. 500 Euro, B2B, Deutschland. OEM möglich, MOQ 10 Stück.',
    categoryId: 'food', categoryAnswers: { type: 'industrial_gastro_equipment', equipment_kind: 'dispenser', power: '230v', cleaning: true },
    targetMarkets: ['DE'], businessType: 'B2B', projects: ['babel'], purposes: ['test_babel', 'import_resell'], seasons: ['all'],
    interest: 5, oem: true, fairId: 'fhc-shanghai-2026', hall: 'N3',
    pricing: { supplierPrice: 480, currency: 'EUR', moq: 10, targetSellingPrice: 990, note: 'EXW Shanghai' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Shanghai Saucetech Co., Ltd.', contactPerson: 'Kevin Wu', phone: '+86 139 1111 2222', wechat: 'kevin_saucetech', boothNumber: 'N3-B21' },
    investors: [{ investorId: 'AA', type: 'equity', readiness: 'likely' }],
    regulatory: { risk: 'medium', topics: ['CE', 'FOOD'], note: '' },
  },
  {
    key: 'camera', emoji: '📷', tint: '#6D5BD0', daysAgo: 0, name: 'Smart inventory camera',
    voiceTranscript: 'Kamera die Regale scannt und Bestand zählt. Für Lokka integrieren, Kiosk testen. Abo Modell.',
    categoryId: 'automation', categoryAnswers: { type: 'hardware', hardware_kind: ['cameras'], sdk: true },
    targetMarkets: ['DE'], businessType: 'B2B', projects: ['lokka'], purposes: ['integrate_lokka', 'b2b_solution'],
    interest: 4, fairId: 'nepcon-asia-2026', hall: '9',
    pricing: { supplierPrice: 129, currency: 'USD', moq: 50, note: 'plus cloud fee per month' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Shenzhen VisionShelf Technology', contactPerson: 'Amy Zhang', email: 'amy@visionshelf.example', boothNumber: '9F12' },
    investors: [{ investorId: 'DH', type: 'both_unknown', readiness: 'maybe' }],
  },
  {
    key: 'packaging', emoji: '🥡', tint: '#3E8E6A', daysAgo: 1, name: 'Bagasse take-away box with clip lid',
    voiceTranscript: 'Verpackung aus Zuckerrohr, mikrowellengeeignet, für Babel take away. Eigenes Logo möglich, MOQ 20.000.',
    categoryId: 'packaging', categoryAnswers: { purpose: 'food', temp: 'hot', reuse: 'disposable', material: ['bagasse_fibre'], microwave: true, food_contact: true, takeaway: true },
    targetMarkets: ['DE', 'SY'], businessType: 'B2B', projects: ['babel', 'import'], purposes: ['import_resell', 'test_babel'],
    interest: 4, oem: true, fairId: 'fhc-shanghai-2026',
    pricing: { supplierPrice: 0.09, currency: 'USD', moq: 20000, targetSellingPrice: 0.22, note: 'FOB Ningbo' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Zhejiang GreenPack', contactPerson: 'Leo Chen', boothNumber: 'E1-C08' },
    regulatory: { risk: 'medium', topics: ['PACKAGING', 'FOOD'], note: 'LUCID registration needed' },
  },
  {
    key: 'feeder', emoji: '🐾', tint: '#F29D38', daysAgo: 1, name: 'Smart pet feeder with camera',
    voiceTranscript: 'Futterautomat mit App und Kamera. B2C, Amazon. Weihnachten gut.',
    categoryId: 'trading', categoryAnswers: { type: 'pet', battery: true, app: true, amazon: 'yes_many' },
    targetMarkets: ['DE'], businessType: 'B2C', projects: ['own_brand'], purposes: ['own_brand'], seasons: ['christmas'],
    interest: 3, fairId: 'superterminal-expo-2026',
    pricing: { supplierPrice: 210, currency: 'CNY', moq: 300, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Dongguan PetJoy Electronics', contactPerson: 'Sunny Li', wechat: 'sunny_petjoy' },
    regulatory: { risk: 'medium', topics: ['CE', 'WEEE', 'BATTERY'], note: '' },
  },
  {
    key: 'robot', emoji: '🦾', tint: '#44546A', daysAgo: 2, name: 'Mini robotic arm (6-axis, desktop)',
    voiceTranscript: 'Kleiner Roboterarm, Python SDK, für Ideen und Prototypen. Nur Recherche.',
    categoryId: 'industry', categoryAnswers: { type: 'robots', interest: 'serious_research', programming: 'code_sdk', demo_seen: true },
    targetMarkets: ['DE'], businessType: 'B2B', projects: ['startup'], purposes: ['develop_own', 'idea_only'],
    interest: 3, fairId: 's-factory-expo-2026',
    pricing: { supplierPrice: 1800, currency: 'USD', moq: 1, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Shenzhen ArmLab Robotics', boothNumber: '5A-22' },
    regulatory: { risk: 'high', topics: ['CE', 'DOC'], note: '' },
  },
  {
    key: 'energy', emoji: '⚡', tint: '#C7851A', daysAgo: 2, name: 'Plug-in energy monitor (WiFi)',
    voiceTranscript: 'Strommessgerät für Steckdose, App, für Kiosk und Babel Stromkosten. B2B2C.',
    categoryId: 'energy', categoryAnswers: { type: 'energy_monitoring', battery: false, segment: 'both', location: 'indoor' },
    targetMarkets: ['DE'], businessType: 'B2B2C', projects: ['babel', 'import'], purposes: ['import_resell'],
    interest: 2, fairId: 'nepcon-asia-2026',
    pricing: { supplierPrice: 6.5, currency: 'USD', moq: 1000, targetSellingPrice: 24, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Shenzhen VisionShelf Technology', contactPerson: 'Amy Zhang' },
  },
  {
    key: 'stem', emoji: '🧪', tint: '#1E7A5F', daysAgo: 3, name: 'STEM electronics learning kit',
    voiceTranscript: 'Lernset Elektronik für Kinder 10 bis 14, Schulanfang, eigene Marke.',
    categoryId: 'school_office', categoryAnswers: { area: 'school', school_kind: 'stem', age: '10_14', electronic: true },
    targetMarkets: ['DE', 'OTHER'], otherCountries: ['Austria'], businessType: 'B2C', projects: ['own_brand'], purposes: ['own_brand'], seasons: ['back_to_school', 'christmas'],
    interest: 4, oem: true, fairId: 'superterminal-expo-2026',
    pricing: { supplierPrice: 7.8, currency: 'USD', moq: 500, targetSellingPrice: 39.9, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Shenzhen ArmLab Robotics', contactPerson: 'Tom He' },
    regulatory: { risk: 'high', topics: ['TOY', 'CE', 'WEEE'], note: '' },
  },
  {
    key: 'recovery', emoji: '💆', tint: '#C2185B', daysAgo: 3, name: 'Portable massage recovery gun',
    voiceTranscript: 'Massagepistole klein, Akku, Fitness Recovery, Amazon viel Konkurrenz.',
    categoryId: 'care_fitness', categoryAnswers: { area: 'fitness', fitness_kind: 'recovery', electronic: true, medical_claim: false },
    targetMarkets: ['DE', 'SY'], businessType: 'B2C', projects: ['import'], purposes: ['import_resell', 'market_observation'],
    interest: 2, fairId: 'superterminal-expo-2026',
    pricing: { supplierPrice: 95, currency: 'CNY', moq: 200, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Ningbo FitCore', contactPerson: 'Jason Xu' },
  },
  {
    key: 'vending', emoji: '🏪', tint: '#FF4FA3', daysAgo: 0, name: 'Smart vending fridge (weight sensors)',
    voiceTranscript: 'Kühlschrank Automat mit Gewichtssensoren, Kartenzahlung, für Kiosk Westend. Sehr interessant.',
    categoryId: 'retail', categoryAnswers: { type: 'vending_machines', installation: true, software: true, subscription: true, payments: ['ec_girocard', 'visa_mastercard'] },
    targetMarkets: ['DE'], businessType: 'B2B', projects: ['lokka', 'startup'], purposes: ['b2b_solution', 'integrate_lokka'],
    interest: 5, fairId: 'nepcon-asia-2026', hall: '11',
    pricing: { supplierPrice: 1650, currency: 'USD', moq: 1, startupCapital: 15000, note: 'incl. 1 year software' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Guangzhou SmartBox Retail', contactPerson: 'Alice Huang', whatsapp: '+86 138 2222 3333', boothNumber: '11B-05' },
    investors: [{ investorId: 'NA', type: 'equity', readiness: 'likely' }, { investorId: 'JS', type: 'loan', readiness: 'maybe' }],
    regulatory: { risk: 'high', topics: ['CE', 'ROHS', 'WEEE'], note: 'Fiscal / TSE check' },
  },
  {
    key: 'food', emoji: '🍜', tint: '#F2849F', daysAgo: 1, name: 'Self-heating rice meal (shelf-stable)',
    voiceTranscript: 'Selbsterhitzendes Reisgericht, 12 Monate haltbar, halal, Ramadan interessant, Syrien.',
    categoryId: 'food', categoryAnswers: { type: 'trading_goods', food_kind: 'shelf_stable_food', storage: 'shelf_stable', halal: true, shelf_life: '12' },
    targetMarkets: ['SY', 'DE'], businessType: 'B2C', projects: ['import'], purposes: ['import_resell'], seasons: ['ramadan'],
    interest: 4, fairId: 'fhc-shanghai-2026',
    pricing: { supplierPrice: 1.4, currency: 'USD', moq: 5000, note: '' },
    supplier: { ...EMPTY_SUPPLIER, company: 'Chongqing HotPot Foods', contactPerson: 'Mia Liu', wechat: 'mia_hotpot' },
    regulatory: { risk: 'high', topics: ['FOOD', 'PACKAGING'], note: '' },
  },
];

function demoImage(emoji: string, tint: string, label: string): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 900;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 1200, 900);
  grad.addColorStop(0, '#16121A'); grad.addColorStop(1, tint);
  g.fillStyle = grad; g.fillRect(0, 0, 1200, 900);
  g.globalAlpha = 0.18; g.strokeStyle = '#FF4FA3'; g.lineWidth = 14;
  [320, 250, 180].forEach((r) => { g.beginPath(); g.arc(980, 760, r, 0, Math.PI * 2); g.stroke(); });
  g.globalAlpha = 1; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '300px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; g.fillText(emoji, 600, 400);
  g.fillStyle = '#ffffff'; g.font = '600 52px system-ui, sans-serif'; g.fillText(label, 600, 760);
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.85));
}

export const isDemo = (id: string) => id.startsWith('demo-');

export async function loadDemoData(): Promise<number> {
  let n = 0;
  for (const d of DEMOS) {
    const id = `demo-${d.key}`;
    if (await db.products.get(id)) continue;
    const { key: _k, emoji, tint, daysAgo, ...fields } = d;
    const base = blankProduct(currentOwner());
    const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
    const p: Product = {
      ...base, ...fields, description: DESCRIPTIONS[d.key] ?? '', id, createdAt: created, updatedAt: created,
      pricing: { ...base.pricing, ...(fields.pricing ?? {}) },
      regulatory: { ...base.regulatory, ...(fields.regulatory ?? {}) },
      history: [{ at: created, action: 'created' }],
      needsReview: true,
    };
    const photo = await addPhoto(id, await demoImage(emoji, tint, p.name), 'product');
    p.photos = [photo];
    await saveNewProduct(p);
    n++;
  }
  return n;
}

/** Removes only demo records (ids starting with "demo-"). Real products are never hard-deleted. */
export async function removeDemoData(): Promise<number> {
  const ids = (await db.products.toArray()).filter((p) => isDemo(p.id)).map((p) => p.id);
  await db.transaction('rw', db.products, db.photoBlobs, db.sync, async () => {
    await db.products.bulkDelete(ids);
    await db.photoBlobs.where('productId').anyOf(ids).delete();
    await db.sync.bulkDelete(ids);
  });
  return ids.length;
}
