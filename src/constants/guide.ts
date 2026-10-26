import type { Priority, ProjectId } from '../types/models';

/* ===================== Phrases (中文 to show, Pinyin to read) ===================== */

export type PhraseCat = 'greet' | 'firm' | 'price' | 'close';

export interface Phrase {
  id: string;
  cat: PhraseCat;
  zh: string;
  py: string;
  en: string;
  de: string;
}

export const PHRASE_CATS: { id: PhraseCat; label: string }[] = [
  { id: 'greet', label: 'Greeting' },
  { id: 'firm', label: 'Company & product' },
  { id: 'price', label: 'Price & terms' },
  { id: 'close', label: 'Closing & practical' },
];

export const PHRASES: Phrase[] = [
  // Greeting & contact
  { id: 'hello', cat: 'greet', zh: '你好，我来自德国。', py: 'Nǐ hǎo, wǒ láizì Déguó.', en: "Hello, I'm from Germany.", de: 'Hallo, ich komme aus Deutschland.' },
  { id: 'buyer', cat: 'greet', zh: '我是采购商。', py: 'Wǒ shì cǎigòushāng.', en: "I'm a buyer.", de: 'Ich bin Einkäufer.' },
  { id: 'card', cat: 'greet', zh: '这是我的名片。', py: 'Zhè shì wǒ de míngpiàn.', en: 'This is my business card.', de: 'Meine Visitenkarte.' },
  { id: 'wechat', cat: 'greet', zh: '可以加微信吗？', py: 'Kěyǐ jiā Wēixìn ma?', en: 'Can we add on WeChat?', de: 'WeChat austauschen?' },
  { id: 'scan', cat: 'greet', zh: '我扫你的二维码。', py: 'Wǒ sǎo nǐ de èrwéimǎ.', en: "I'll scan your QR code.", de: 'Ich scanne deinen QR-Code.' },
  { id: 'brochure', cat: 'greet', zh: '有英文资料吗？', py: 'Yǒu Yīngwén zīliào ma?', en: 'Do you have English brochures?', de: 'Englische Unterlagen?' },

  // Company & product
  { id: 'factory', cat: 'firm', zh: '你们是工厂还是贸易公司？', py: 'Nǐmen shì gōngchǎng háishì màoyì gōngsī?', en: 'Factory or trading company?', de: 'Fabrik oder Händler?' },
  { id: 'distributor', cat: 'firm', zh: '你们在德国有代理商吗？', py: 'Nǐmen zài Déguó yǒu dàilǐshāng ma?', en: 'Do you have a distributor in Germany?', de: 'Vertriebspartner in DE?' },
  { id: 'ce', cat: 'firm', zh: '有CE认证吗？', py: 'Yǒu CE rènzhèng ma?', en: 'Do you have CE certification?', de: 'CE-Zertifikat?' },
  { id: 'cerohs', cat: 'firm', zh: '有CE和RoHS证书吗？', py: 'Yǒu CE hé RoHS zhèngshū ma?', en: 'Do you have CE and RoHS certificates?', de: 'CE- und RoHS-Zertifikate?' },
  { id: 'nfc', cat: 'firm', zh: '我需要NFC芯片和读卡器。', py: 'Wǒ xūyào NFC xīnpiàn hé dúkǎqì.', en: 'I need NFC chips and readers.', de: 'NFC-Chips und Reader.' },
  { id: 'logo', cat: 'firm', zh: '可以印我们的logo吗？', py: 'Kěyǐ yìn wǒmen de logo ma?', en: 'Can you print our logo?', de: 'Mit unserem Logo?' },
  { id: 'custom', cat: 'firm', zh: '可以做定制吗？', py: 'Kěyǐ zuò dìngzhì ma?', en: 'Do you do custom orders?', de: 'Sonderanfertigung möglich?' },
  { id: 'stock', cat: 'firm', zh: '请问有现货吗？', py: 'Qǐngwèn yǒu xiànhuò ma?', en: 'Do you have it in stock?', de: 'Auf Lager?' },
  { id: 'catalog', cat: 'firm', zh: '能给我一份产品目录吗？', py: 'Néng gěi wǒ yí fèn chǎnpǐn mùlù ma?', en: 'Can I get a product catalogue?', de: 'Produktkatalog?' },
  { id: 'edu', cat: 'firm', zh: '有教育版本吗？', py: 'Yǒu jiàoyù bǎnběn ma?', en: 'Is there an education version?', de: 'Edu-Version?' },
  { id: 'eu-reseller', cat: 'firm', zh: '欧洲有经销商吗？', py: 'Ōuzhōu yǒu jīngxiāoshāng ma?', en: 'Do you have a reseller in Europe?', de: 'Händler in Europa?' },

  // Price & terms
  { id: 'moq', cat: 'price', zh: '最小起订量是多少？', py: 'Zuìxiǎo qǐdìngliàng shì duōshǎo?', en: 'What is the MOQ?', de: 'Mindestmenge?' },
  { id: 'price1000', cat: 'price', zh: '一千个多少钱？', py: 'Yìqiān gè duōshǎo qián?', en: 'How much for 1,000 pcs?', de: 'Preis für 1.000 Stück?' },
  { id: 'best1000', cat: 'price', zh: '一千个最低多少钱？', py: 'Yìqiān gè zuìdī duōshǎo qián?', en: "What's your best price for 1,000 pcs?", de: 'Bester Preis für 1.000?' },
  { id: 'cheaper', cat: 'price', zh: '能便宜一点吗？', py: 'Néng piányi yìdiǎn ma?', en: 'Can you make it cheaper?', de: "Geht's günstiger?" },
  { id: 'compare', cat: 'price', zh: '我们在比较几家供应商。', py: 'Wǒmen zài bǐjiào jǐ jiā gōngyìngshāng.', en: "We're comparing a few suppliers.", de: 'Wir vergleichen mehrere Lieferanten.' },
  { id: 'samples', cat: 'price', zh: '可以寄样品吗？', py: 'Kěyǐ jì yàngpǐn ma?', en: 'Can you send samples?', de: 'Muster schicken?' },
  { id: 'samplecost', cat: 'price', zh: '样品要收费吗？', py: 'Yàngpǐn yào shōufèi ma?', en: 'Do samples cost money?', de: 'Kosten die Muster etwas?' },
  { id: 'samplerefund', cat: 'price', zh: '首单可以退样品费吗？', py: 'Shǒudān kěyǐ tuì yàngpǐn fèi ma?', en: 'Can you refund the sample fee with the first order?', de: 'Musterkosten bei Erstbestellung zurück?' },
  { id: 'lead', cat: 'price', zh: '交货期多久？', py: 'Jiāohuòqī duō jiǔ?', en: "What's the lead time?", de: 'Lieferzeit?' },
  { id: 'payment', cat: 'price', zh: '付款方式是什么？', py: 'Fùkuǎn fāngshì shì shénme?', en: 'What are the payment terms?', de: 'Zahlungsbedingungen?' },
  { id: 'fob', cat: 'price', zh: '这个价格是FOB深圳吗？', py: 'Zhège jiàgé shì FOB Shēnzhèn ma?', en: 'Is this price FOB Shenzhen?', de: 'Ist das FOB Shenzhen?' },
  { id: 'shipping', cat: 'price', zh: '包含运费吗？', py: 'Bāohán yùnfèi ma?', en: 'Is shipping included?', de: 'Ist die Fracht inklusive?' },
  { id: 'ship-de', cat: 'price', zh: '可以发货到德国吗？', py: 'Kěyǐ fāhuò dào Déguó ma?', en: 'Can you ship to Germany?', de: 'Versand nach Deutschland?' },
  { id: 'quote', cat: 'price', zh: '请发报价单到我的邮箱。', py: 'Qǐng fā bàojiàdān dào wǒ de yóuxiāng.', en: 'Please email me a quotation.', de: 'Angebot per Mail bitte.' },

  // Closing & practical
  { id: 'thanks', cat: 'close', zh: '谢谢，我们保持联系。', py: 'Xièxie, wǒmen bǎochí liánxì.', en: "Thanks, let's stay in touch.", de: 'Danke, wir bleiben in Kontakt.' },
  { id: 'tonight', cat: 'close', zh: '我再考虑一下，今晚给你发消息。', py: 'Wǒ zài kǎolǜ yíxià, jīnwǎn gěi nǐ fā xiāoxi.', en: "Let me think about it, I'll message you tonight.", de: 'Ich überlege und melde mich heute Abend.' },
  { id: 'photo', cat: 'close', zh: '可以拍照吗？', py: 'Kěyǐ pāizhào ma?', en: 'May I take photos?', de: 'Darf ich fotografieren?' },
  { id: 'video', cat: 'close', zh: '可以拍视频吗？', py: 'Kěyǐ pāi shìpín ma?', en: 'May I film a video?', de: 'Darf ich filmen?' },
  { id: 'again', cat: 'close', zh: '请再说一遍。', py: 'Qǐng zài shuō yí biàn.', en: 'Please say that again.', de: 'Bitte nochmal.' },
  { id: 'slow', cat: 'close', zh: '请说慢一点。', py: 'Qǐng shuō màn yìdiǎn.', en: 'Please speak more slowly.', de: 'Bitte langsamer.' },
  { id: 'write', cat: 'close', zh: '请写下来。', py: 'Qǐng xiě xiàlái.', en: 'Please write it down.', de: 'Bitte aufschreiben.' },
  { id: 'hall15', cat: 'close', zh: '15号馆怎么走？', py: 'Shíwǔ hào guǎn zěnme zǒu?', en: 'How do I get to Hall 15?', de: 'Wie komme ich zu Halle 15?' },
  { id: 'wc', cat: 'close', zh: '洗手间在哪里？', py: 'Xǐshǒujiān zài nǎlǐ?', en: 'Where is the restroom?', de: 'Wo ist die Toilette?' },
];

export const NUMBERS: { zh: string; py: string; n: string }[] = [
  { zh: '十', py: 'shí', n: '10' },
  { zh: '一百', py: 'yìbǎi', n: '100' },
  { zh: '五百', py: 'wǔbǎi', n: '500' },
  { zh: '一千', py: 'yìqiān', n: '1.000' },
  { zh: '五千', py: 'wǔqiān', n: '5.000' },
  { zh: '一万', py: 'yíwàn', n: '10.000' },
];

export const PHRASE_TRICK = 'Bei langen Gesprächen eine Übersetzungs-App im Gesprächsmodus nutzen. Lächeln und „谢谢“ (xièxie) sagen öffnet Türen.';

/* ===================== Pitch ===================== */

export const OPENER = "Hi, I'm Nabil from Frankfurt, Germany. We import and distribute technical products in Germany. Do you already have a distributor there?";

export interface Pitch {
  id: 'hala' | 'lokka' | 'mts' | 'robo';
  tag: ProjectId;
  title: string;
  sub: string;
  text: string;
  tip: string;
}

export const PITCHES: Pitch[] = [
  {
    id: 'hala', tag: 'hala', title: 'HALA', sub: 'Import / Vertrieb · 30 Sek',
    text: "I'm Nabil, Head of Business Development. I represent a small group of companies in Frankfurt: Hala Import Export, an international trading company, and MTS, a technical service company for HVAC, electrical, water and gas installations. We're looking for reliable manufacturers who want to enter the German and EU market. We handle import, local sales and customer contact.",
    tip: 'Du bist die Brücke China → Deutschland. Arabisch/Türkisch nur erwähnen, wenn es um MENA/Türkei geht.',
  },
  {
    id: 'lokka', tag: 'lokka', title: 'LOKKA', sub: 'Hardware',
    text: "We're also building Lokka, a loyalty and POS platform for local shops and restaurants in Germany. We need NFC tags – NTAG 424 DNA –, NFC readers and small touch displays. First samples now, then volume as we roll out to merchants.",
    tip: '„Volume later“ macht dich interessant, ohne dass du dich festlegst. Keine Stückzahlen versprechen.',
  },
  {
    id: 'mts', tag: 'mts', title: 'MTS', sub: 'Einkauf',
    text: 'For MTS we regularly buy power supplies, sensors and HVAC / air-purification components. Everything must have CE and RoHS, and ideally German or English documentation.',
    tip: 'Zertifikate sofort ansprechen. Das filtert unseriöse Anbieter raus.',
  },
  {
    id: 'robo', tag: 'robo', title: 'ROBO', sub: 'Robotik · Jugendzentrum',
    text: "I also work with a youth center in Germany. We're interested in educational robots and STEM kits for workshops with teenagers. Do you have an education program or an EU reseller?",
    tip: 'Bildung öffnet Türen: viele geben Rabatte oder Demo-Geräte. Und: „Can I film for social media?“',
  },
];

export const TALK_TIPS: { title: string; text: string }[] = [
  { title: 'Sag „we“, nicht „I“', text: 'Wirkt größer. Max. 30 Sek über dich, dann fragen. Wer fragt, führt.' },
  { title: 'Visitenkarte', text: 'Mit beiden Händen geben und nehmen, kurz anschauen, nicht sofort einstecken. Keine Karten? WeChat-QR zeigen.' },
  { title: 'WeChat = alles', text: 'Nach dem Scannen sofort eine Notiz in den Kontakt-Namen schreiben, z. B. „Halle15 NFC A“.' },
  { title: 'Die Frage am Ende', text: 'Du erfährst sofort, ob da Business drin ist. Nicht interessant? „Thank you, very nice!“ und weiter. Interessant? Karte, WeChat, Foto vom Stand und Produkt.' },
  { title: 'Badge-Titel', text: 'Head of Business Development · Hala Import Export / MTS' },
];

/* ===================== Deal helper ===================== */

export const MONEY_SAVERS: string[] = [
  "That's higher than I expected.",
  "What's your best price for 1,000 pcs?",
  "What's the price if we order 500 instead of 1,000?",
  "We're comparing a few suppliers here.",
  'If the price is right, we can order regularly.',
  'Can you refund the sample cost with the first order?',
  'Is shipping to Germany included?',
  "Let me think about it, I'll message you tonight.",
];

export const DEAL_RULES: string[] = [
  'Budget nie nennen. Lieber: „What’s your best price for 1,000 pcs?“',
  'Exklusivität für DE erst nach einer Testbestellung verhandeln.',
  'Nichts unterschreiben und nichts bezahlen am Stand.',
  'Preise und Zusagen schriftlich per WeChat oder Mail bestätigen lassen.',
  'Der erste Preis ist nie der letzte. Ruhig bleiben.',
  'Tag 2 = Nachverhandeln: viele geben am Messe-Ende bessere Preise oder Muster mit.',
];

export const GLOSSARY: { term: string; de: string }[] = [
  { term: 'MOQ', de: 'Minimum Order Quantity: Mindestbestellmenge.' },
  { term: 'FOB Shenzhen', de: 'Ware bis aufs Schiff in China. Fracht und Zoll zahlst du.' },
  { term: 'EXW', de: 'Ab Fabrik. Du organisierst alles.' },
  { term: 'DDP', de: 'Bis zur Tür in DE, verzollt. Bequem, aber teurer.' },
  { term: 'T/T 30/70', de: '30 % Anzahlung, 70 % vor Versand (Standard).' },
  { term: 'OEM / ODM', de: 'Mit deinem Logo / deren Design als dein Produkt.' },
  { term: 'PI', de: 'Proforma Invoice: verbindliches Angebot.' },
];

export const EU_DUTIES: string[] = [
  'CE + Konformitätserklärung (DoC) vom Hersteller.',
  'RoHS (Schadstoffe). RED bei Funk (NFC, WLAN, Bluetooth).',
  'ElektroG / WEEE: Registrierung bei Stiftung EAR.',
  'Verpackungsgesetz: Registrierung in LUCID.',
  'Batteriegesetz, wenn Akkus drin sind (z. B. Roboter).',
  'Als Importeur giltst du rechtlich als Hersteller. Vorher klären, ggf. mit Steuerberater oder Zoll. Keine Rechtsberatung.',
];

export const RED_FLAG_CHECK = 'Auf 企查查 (Qichacha) oder Alibaba prüfen.';

/* ===================== Plan: halls, timeline, exhibitors ===================== */

export type HallLevel = 'must' | 'good' | 'time';

export interface HallInfo {
  id: string;
  /** Hall numbers that belong to this tile (used to filter leads by hall). */
  halls: string[];
  title: string;
  sub: string;
  level: HallLevel;
  note: string;
}

export const HALLS: HallInfo[] = [
  { id: 'h7', halls: ['5', '6', '7'], title: 'Hall 7 · ROBOTECH', sub: 'Roboter, Humanoide', level: 'must', note: 'Hall 5–7. Fokus Hall 7. Morgens leerer: Videos drehen. Unitree und UBTECH zuerst, dann die kleinen Firmen.' },
  { id: 'h15', halls: ['15'], title: 'Hall 15 · Components', sub: 'ICs, Relais, Distributoren, NFC/RFID', level: 'must', note: 'Keine Namensliste: selbst suchen. Schilder „NFC“, „RFID“, „Smart Card“.' },
  { id: 'h9', halls: ['9'], title: 'Hall 9 · S-FACTORY', sub: 'Automation, Mean Well', level: 'good', note: 'Mean Well #33, Luftreinigung, Sensoren.' },
  { id: 'hdisp', halls: ['10', '12', '14', '16'], title: 'Hall 10 / 12 / 14 / 16', sub: 'Display & Touch', level: 'good', note: 'Touch-Panels, Displays, Folien: POS-Idee für Lokka. Kurz scannen.' },
  { id: 'h11', halls: ['11'], title: 'Hall 11 · NEPCON', sub: 'SMT, Halbleiter', level: 'time', note: 'Nur wenn Zeit.' },
  { id: 'h13', halls: ['13'], title: 'Hall 13 · NEPCON / AWC', sub: 'Automotive', level: 'time', note: 'Nur wenn Zeit.' },
];

export const HALL_LEVEL_LABEL: Record<HallLevel, string> = { must: 'Pflicht', good: 'Lohnt sich', time: 'Nur wenn Zeit' };

export const SKIP_LIST = 'Skippen spart Zeit: SMT-Bestückung, Löten, Chip-Packaging, Kugellager/Getriebe (#13–36 ROBOTECH), Materialien, Automotive (AWC), Forschungsinstitute.';

export const FAIR_START = '2026-10-27';
export const FAIR_DAYS = [
  { day: 1, date: '2026-10-27', label: 'Tag 1 · Di 27.10.' },
  { day: 2, date: '2026-10-28', label: 'Tag 2 · Mi 28.10.' },
  { day: 3, date: '2026-10-29', label: 'Tag 3 · Do 29.10.' },
] as const;

export interface TimelineItem {
  id: string;
  day: 1 | 2 | 3;
  time: string;
  title: string;
  text: string;
  tags?: ProjectId[];
  hall?: string;
}

export const TIMELINE: TimelineItem[] = [
  { id: 'd1-badge', day: 1, time: '09:00', title: 'South Lobby: Badge', hall: 'South Lobby',
    text: 'Badge holen (Registrierungs-Mail / QR mitnehmen). Am Info-Counter nach den Zeiten fragen: Going Global, Networking Mixer, Business Matchmaking. Hallen-Guide mitnehmen.' },
  { id: 'd1-eeday', day: 1, time: '10:10', title: 'Eastern Europe Day', hall: 'Overseas Visitor Lounge', tags: ['hala'],
    text: '10:10–13:00. Botschaften, ungarischer Elektronikverband, chinesische Anbieter mit Ziel Europa. Inkl. Networking-Lunch (optional, aber guter Hala-Kontakt).' },
  { id: 'd1-h15', day: 1, time: '13:00', title: 'Hall 15: NFC/RFID, Distributoren', hall: '15', tags: ['lokka', 'mts', 'hala'],
    text: '13:00–16:15. NFC/RFID-Stände, Distributoren, Relais, Stecker.' },
  { id: 'd1-h1614', day: 1, time: '16:15', title: 'Hall 16 / 14: Touch-Displays', hall: '16', tags: ['lokka'],
    text: '16:15–17:00. Touch-Displays kurz scannen.' },
  { id: 'd1-eve', day: 1, time: '18:00', title: 'Abends: Follow-up', tags: [],
    text: 'Leads A/B/C sortieren. WeChat-Follow-up senden (Tab Follow-up).' },

  { id: 'd2-h7', day: 2, time: '09:00', title: 'Hall 7 ROBOTECH', hall: '7', tags: ['robo', 'hala'],
    text: '09:00–11:00. Morgens leerer: Videos drehen. Unitree, UBTECH, dann die kleinen Firmen.' },
  { id: 'd2-h9', day: 2, time: '11:00', title: 'Hall 9 S-FACTORY', hall: '9', tags: ['mts'],
    text: '11:00–13:00. Mean Well, Luftreinigung, Sensoren.' },
  { id: 'd2-lunch', day: 2, time: '13:00', title: 'Lunch + Notizen nachtragen',
    text: '13:00–14:00. Leads vervollständigen, Prioritäten setzen.' },
  { id: 'd2-gg', day: 2, time: '14:00', title: 'Going Global / Networking Mixer',
    text: '14:00–15:30. Falls die Zeiten passen, oder Matchmaking-Termine.' },
  { id: 'd2-round2', day: 2, time: '15:30', title: 'Zweite Runde bei den A-Leads',
    text: '15:30–17:00. Nachverhandeln, Muster klären. Viele geben am Ende bessere Preise.' },
  { id: 'd2-eve', day: 2, time: '18:00', title: 'Abends: Follow-up + Zusammenfassung',
    text: 'Follow-ups senden. Dann: Muster bestellen, Angebote vergleichen.' },

  { id: 'd3-last', day: 3, time: '09:00', title: 'Letzter Tag (kürzer)',
    text: 'Öffnungszeiten vor Ort prüfen. Offene A-Leads nachfassen, Muster abholen, Kataloge sammeln.' },
];

export interface Exhibitor {
  id: string;
  name: string;
  hall: string;
  booth?: string;
  prio: Priority;
  tags: ProjectId[];
  why: string;
  ask: string[];
}

export const EXHIBITORS: Exhibitor[] = [
  { id: 'nfc', name: 'NFC / RFID manufacturers', hall: '15', prio: 'A', tags: ['lokka'],
    why: 'NTAG 424 DNA Tags, Sticker, Karten und Reader direkt ab Fabrik. Schilder „NFC“, „RFID“, „Smart Card“.',
    ask: ['NTAG 424 DNA vorrätig?', 'Preis bei 1k / 10k?', 'Custom-Druck?', 'Reader mit SDK?'] },
  { id: 'distri', name: 'Distributors / E-commerce', hall: '15', prio: 'A', tags: ['mts', 'hala'],
    why: 'Breites Sortiment, kleine Mengen möglich.',
    ask: ['Kleine MOQ?', 'Versand nach DE?', 'EU-Lager?'] },
  { id: 'relay', name: 'Relays, switches, connectors', hall: '15', prio: 'B', tags: ['mts'],
    why: 'Elektro-Verbrauchsmaterial günstiger.',
    ask: ['CE / RoHS / VDE?', 'Datenblätter auf Englisch?'] },
  { id: 'meanwell', name: 'Mean Well', hall: '9', booth: '33', prio: 'A', tags: ['mts', 'hala'],
    why: 'Netzteile und LED-Treiber, Weltmarke, gut verkäuflich.',
    ask: ['Wer ist offizieller Distributor in DE?', 'Konditionen für Installateure?'] },
  { id: 'kangjing', name: 'Kangjing', hall: '9', booth: '45', prio: 'B', tags: ['mts'],
    why: 'Luftreinigung, passt zu Klima.', ask: ['Produkte für Gewerbe/Gastro?', 'CE?', 'DE-Partner?'] },
  { id: 'minghang', name: 'Minghang Purification', hall: '9', booth: '49', prio: 'B', tags: ['mts'],
    why: 'Luftreinigung, passt zu Klima.', ask: ['Produkte für Gewerbe/Gastro?', 'CE?', 'DE-Partner?'] },
  { id: 'trensia', name: 'Trensia Sensing', hall: '9', booth: '38', prio: 'B', tags: ['mts', 'lokka'],
    why: 'Sensoren (Temperatur, Feuchte …).', ask: ['Smart-Home-fähig?', 'Schnittstellen (Modbus, WLAN)?'] },
  { id: 'toshiba', name: 'Toshiba', hall: '9', booth: '29', prio: 'C', tags: [], why: 'Große Namen, eher anschauen.', ask: [] },
  { id: 'siasun', name: 'Siasun Robot', hall: '9', booth: '14', prio: 'C', tags: [], why: 'Große Namen, eher anschauen.', ask: [] },
  { id: 'ubtech', name: 'UBTECH', hall: '7', booth: '5', prio: 'A', tags: ['robo'],
    why: 'Edu-Roboter und STEM-Kits fürs JUZ.', ask: ['Education program?', 'EU-Reseller?', 'Preise für Jugendzentren?'] },
  { id: 'unitree', name: 'Unitree', hall: '7', booth: '1', prio: 'A', tags: ['robo'],
    why: 'Roboterhund Go2, Humanoide. Top-Content.', ask: ['Edu-Version?', 'EU-Händler?', 'Darf ich filmen?'] },
  { id: 'haoling', name: 'Haoling', hall: '7', booth: '4', prio: 'A', tags: ['hala'],
    why: 'Kleinere Firma, evtl. noch kein DE-Vertrieb.', ask: ['Distributor in Germany?', 'Wenn nein: Vertriebs-Gespräch.'] },
  { id: 'leju', name: 'Leju', hall: '7', booth: '7', prio: 'A', tags: ['hala'],
    why: 'Kleinere Firma, evtl. noch kein DE-Vertrieb.', ask: ['Distributor in Germany?', 'Wenn nein: Vertriebs-Gespräch.'] },
  { id: 'amigo', name: 'Amigo', hall: '7', booth: '8', prio: 'A', tags: ['hala'],
    why: 'Kleinere Firma, evtl. noch kein DE-Vertrieb.', ask: ['Distributor in Germany?', 'Wenn nein: Vertriebs-Gespräch.'] },
  { id: 'xinghuida', name: 'Xinghuida', hall: '7', booth: '9', prio: 'A', tags: ['hala'],
    why: 'Kleinere Firma, evtl. noch kein DE-Vertrieb.', ask: ['Distributor in Germany?', 'Wenn nein: Vertriebs-Gespräch.'] },
  { id: 'deeprobotics', name: 'DeepRobotics', hall: '7', booth: '3', prio: 'B', tags: ['mts'],
    why: 'Inspektions-Roboterhunde für Anlagen.', ask: ['Use-Cases für Gebäudetechnik?'] },
  { id: 'touch', name: 'Touch-panel makers', hall: '10–16', prio: 'B', tags: ['lokka'],
    why: 'Günstige Touch-Displays: eigenes Lokka-Terminal oder Kiosk-Display.',
    ask: ['Android-Board dabei?', '10–15 Zoll?', 'MOQ für Muster?'] },
];

export const EXHIBITOR_NOTE = 'Ausstellerlisten sind „partial“: vor Ort kommen mehr dazu. A = unbedingt · B = wenn Zeit · C = optional.';

export const CHECKLIST: string[] = [
  'Reisepass',
  'Registrierungs-Mail / QR',
  'Visitenkarten oder WeChat-QR',
  'Powerbank + Kabel',
  'WeChat Pay / Alipay aktiv',
  'Übersetzer-App offline',
  'Bequeme Schuhe, Wasser',
  'Tasche für Kataloge',
];

export const AFTER_FAIR: string[] = [
  'A-Leads: Muster bestellen',
  'Angebote vergleichen (Preis, MOQ, Zertifikate)',
  'Firmen auf 企查查 / Alibaba prüfen',
  'EU-Pflichten klären (siehe Deal helper)',
  'Content schneiden (Hall 7)',
];

export const GAME_PLAN_MOTTO = 'Wenig reden, viel fragen, alles notieren, am Abend nachfassen.';
