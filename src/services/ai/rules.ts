import type {
  AnswerValue, CategoryId, Currency, MarketId, ProjectId, PurposeId, SeasonId, StructuredSuggestion,
} from '../../types/models';

/**
 * Offline, rule-based parser for German/English voice notes.
 * Runs instantly without internet; only returns what is literally said (never guesses).
 */

const has = (text: string, re: RegExp) => re.test(text);

const OTHER_COUNTRIES: [RegExp, string][] = [
  [/österreich|austria/, 'Austria'], [/schweiz|switzerland/, 'Switzerland'], [/türkei|turkey|türkiye/, 'Turkey'],
  [/libanon|lebanon/, 'Lebanon'], [/jordanien|jordan/, 'Jordan'], [/irak|iraq/, 'Iraq'], [/saudi/, 'Saudi Arabia'],
  [/dubai|vae|uae|emirate/, 'United Arab Emirates'], [/niederlande|holland|netherlands/, 'Netherlands'],
  [/frankreich|france/, 'France'], [/polen|poland/, 'Poland'], [/ägypten|egypt/, 'Egypt'],
];

const CATEGORY_KEYWORDS: [CategoryId, RegExp][] = [
  ['retail', /vending|verkaufsautomat|self[- ]?checkout|selbstbedien|preisschild|price label|e-?ink label|smart retail/g],
  ['energy', /energie|energy|batterie|battery|akku|solar|power ?station|powerbank|ladeger|charger|stromz|smart meter|speicher|storage system|wallbox/g],
  ['automation', /software|\bpos\b|kassensystem|sensor|kamera|camera|rfid|nfc|inventur|inventory|lagerverwalt|warehouse|\bcrm\b|\bki\b|\bai\b/g],
  ['industry', /roboter|robot|roboterarm|robotic arm|cnc|greifer|gripper|förderband|conveyor|produktionsmaschine|machine vision/g],
  ['packaging', /verpackung|packaging|becher|\bcups?\b|karton|\bbox(en)?\b|tüte|beutel|pouch|deckel|\blid\b/g],
  ['food', /soße|sauce|kaffee|coffee|food|lebensmittel|snack|getränk|beverage|drink|süßigkeit|candy|sweets|gastro|essen|nudel|noodle|gewürz|spice|dispenser|spender|haltbar/g],
  ['school_office', /schule|school|rucksack|backpack|\bstem\b|lernspiel|learning|büro|office|schreibtisch|desk|stift|stationery/g],
  ['care_fitness', /fitness|massage|recovery|regeneration|beauty|haare?|\bhair\b|pflege|kosmetik|cosmetic|training|yoga|grooming/g],
  ['trading', /gadget|haushalt|household|haustier|\bpet\b|futter|feeder|auto zubehör|car |smart home|\biot\b|camping|reise|travel|küchenhelfer|kitchen/g],
];

export function detectCategory(text: string): CategoryId | undefined {
  let best: CategoryId | undefined;
  let bestScore = 0;
  for (const [id, re] of CATEGORY_KEYWORDS) {
    const score = text.match(re)?.length ?? 0;
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

function detectPrice(text: string): { amount: number; currency: Currency } | undefined {
  const cur = '(€|euro|eur|\\$|dollar|usd|us-dollar|yuan|rmb|cny|¥|renminbi)';
  const num = '(\\d{1,3}(?:[.\\s]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(k|tausend|thousand)?';
  const after = text.match(new RegExp(`${num}\\s*${cur}`, 'i'));
  const before = text.match(new RegExp(`${cur}\\s*${num}`, 'i'));
  let amountStr: string | undefined; let mult: string | undefined; let curStr: string | undefined;
  if (after) { [, amountStr, mult, curStr] = after; } else if (before) { [, curStr, amountStr, mult] = before; }
  if (!amountStr || !curStr) return undefined;
  let amount = Number(amountStr.replace(/[.\s](?=\d{3}\b)/g, '').replace(',', '.'));
  if (mult) amount *= 1000;
  if (!Number.isFinite(amount)) return undefined;
  const c = curStr.toLowerCase();
  const currency: Currency = /\$|dollar|usd/.test(c) ? 'USD' : /yuan|rmb|cny|¥|renminbi/.test(c) ? 'CNY' : 'EUR';
  return { amount, currency };
}

function detectMoq(text: string): number | undefined {
  const m = text.match(/(?:moq|mindestmenge|mindestabnahme|minimum order(?: quantity)?)\D{0,25}(\d[\d.]*)/i)
    ?? text.match(/(?:ab|from|minimum|mindestens)\s+(\d[\d.]*)\s*(?:stück|stk|units?|pcs|pieces|einheiten)/i);
  return m ? Number(m[1].replace(/\./g, '')) : undefined;
}

function detectName(original: string): string | undefined {
  const first = original.split(/[,.;!?\n]| - /)[0]?.trim() ?? '';
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 6) return undefined;
  if (/interess|für |for |\bb2b|\bb2c|euro|€|\$|deutschland|germany|syri|babel|lokka|vielleicht|maybe|ich |i think|das ist|this is|moq/i.test(first)) {
    return undefined;
  }
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function parseVoiceNote(original: string): StructuredSuggestion {
  const text = original.toLowerCase();
  const out: StructuredSuggestion = {};
  if (!text.trim()) return out;

  const markets = new Set<MarketId>();
  const others: string[] = [];
  if (has(text, /deutschland|germany|deutsche[nr]? markt|german market/)) markets.add('DE');
  if (has(text, /syrien|syria|damaskus|damascus|aleppo/)) markets.add('SY');
  for (const [re, name] of OTHER_COUNTRIES) if (re.test(text)) others.push(name);
  if (others.length) markets.add('OTHER');
  if (has(text, /mehrere märkte|multiple markets|weltweit|worldwide|international/)) markets.add('MULTI');
  if (markets.size) out.targetMarkets = [...markets];
  if (others.length) out.otherCountries = others;

  if (has(text, /\bb2b2c\b/)) out.businessType = 'B2B2C';
  else if (has(text, /\bb2b\b|für (firmen|unternehmen|restaurants|händler)|for (businesses|companies|restaurants)/)) out.businessType = 'B2B';
  else if (has(text, /\bb2c\b|endkunden|endverbraucher|consumers?\b/)) out.businessType = 'B2C';

  const projects = new Set<ProjectId>();
  if (has(text, /babel/)) projects.add('babel');
  if (has(text, /lokka/)) projects.add('lokka');
  if (has(text, /import/)) projects.add('import');
  if (has(text, /eigene marke|own brand|eigenmarke/)) projects.add('own_brand');
  if (has(text, /startup|start-up/)) projects.add('startup');
  if (projects.size) out.projects = [...projects];

  const purposes = new Set<PurposeId>();
  if (has(text, /bei babel testen|test(en)? (at|bei|in) babel|babel test/)) purposes.add('test_babel');
  if (has(text, /lokka integr|integrate (with|into) lokka|in lokka/)) purposes.add('integrate_lokka');
  if (has(text, /import(ieren)?|weiterverkauf|resell/)) purposes.add('import_resell');
  if (has(text, /eigene marke|own brand|eigenmarke|private label/)) purposes.add('own_brand');
  if (has(text, /selbst entwickeln|develop (our|my) own|nachbauen/)) purposes.add('develop_own');
  if (has(text, /nur beobacht|observation only|marktbeobachtung/)) purposes.add('market_observation');
  if (has(text, /nur (eine )?idee|just an idea|idea only/)) purposes.add('idea_only');
  if (purposes.size) out.purposes = [...purposes];

  const seasons = new Set<SeasonId>();
  if (has(text, /ramadan/)) seasons.add('ramadan');
  if (has(text, /weihnacht|christmas|xmas/)) seasons.add('christmas');
  if (has(text, /sommer|summer/)) seasons.add('summer');
  if (has(text, /\bwinter/)) seasons.add('winter');
  if (has(text, /frühling|spring/)) seasons.add('spring');
  if (has(text, /herbst|autumn|fall season/)) seasons.add('autumn');
  if (has(text, /schulanfang|einschulung|back to school/)) seasons.add('back_to_school');
  if (has(text, /ganzjährig|ganze jahr|all season|all year/)) seasons.add('all');
  if (seasons.size) out.seasons = [...seasons];

  const price = detectPrice(text);
  if (price) out.price = price;
  const moq = detectMoq(text);
  if (moq) out.moq = moq;
  if (has(text, /\boem\b|\bodm\b|private label|eigenes logo|own logo|with our logo/)) out.oem = true;

  if (has(text, /mega|genial|super interessant|top produkt|must have|extrem interessant|very very/)) out.interest = 5;
  else if (has(text, /sehr interessant|very interesting|richtig gut|really good/)) out.interest = 4;

  const categoryId = detectCategory(text);
  if (categoryId) {
    out.categoryId = categoryId;
    const answers: Record<string, AnswerValue> = {};
    if (categoryId === 'food') {
      answers.type = has(text, /maschine|machine|dispenser|spender|automat|roboter|robot|gerät|equipment/)
        ? 'industrial_gastro_equipment' : 'trading_goods';
      if (answers.type === 'industrial_gastro_equipment' && has(text, /dispenser|spender/)) answers.equipment_kind = 'dispenser';
    }
    if (categoryId === 'automation') answers.type = has(text, /software|app|\bpos\b|crm|\bki\b|\bai\b/) && !has(text, /kamera|camera|sensor/) ? 'software' : 'hardware';
    if (Object.keys(answers).length) out.categoryAnswers = answers;
  }

  const words = original.trim().split(/\s+/).filter(Boolean);
  const fallbackName = words.length ? words.slice(0, 4).join(' ').replace(/[,.;:!?]+$/, '') : undefined;
  const name = detectName(original) ?? fallbackName;
  if (name) out.name = name.charAt(0).toUpperCase() + name.slice(1);
  const spoken = original.replace(/\s+/g, ' ').trim();
  if (spoken) out.description = spoken.length > 280 ? `${spoken.slice(0, 277)}...` : spoken;
  return out;
}
