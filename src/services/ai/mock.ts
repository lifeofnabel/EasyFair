import { CATEGORY_MAP, productType } from '../../constants/categories';
import type { CategoryId, Product, RegTopicId, RiskLevel, ScoreDimension } from '../../types/models';
import type { AiProvider, AnalysisResult, CaptureInput, ScoreResult } from './types';
import { parseVoiceNote } from './rules';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

const CATEGORY_TRAITS: Record<CategoryId, { adv: string[]; dis: string[]; questions: string[]; reg: RegTopicId[]; risk: RiskLevel }> = {
  food: {
    adv: ['Consumable product with repeat purchases.', 'Easy to test in a real kitchen (Babel).'],
    dis: ['Food law and labelling in German are mandatory.', 'Shelf life and cold chain can limit logistics.'],
    questions: ['Does it fit Babel\'s daily workflow without extra staff?', 'Is German labelling and an EU importer of record possible?', 'What does the shelf life look like after sea freight?'],
    reg: ['FOOD', 'PACKAGING'], risk: 'medium',
  },
  packaging: {
    adv: ['Constant demand in gastro and retail.', 'Custom branding can raise margins.'],
    dis: ['Low unit price: volume and freight dominate cost.', 'German packaging law (VerpackG) registration needed.'],
    questions: ['Is the material allowed for direct food contact in the EU?', 'Can it be branded at a sensible MOQ?', 'How does landed cost compare with EU suppliers?'],
    reg: ['PACKAGING', 'FOOD'], risk: 'medium',
  },
  automation: {
    adv: ['Can save labour time every day.', 'Recurring revenue possible with software or service.'],
    dis: ['Integration and support effort is often underestimated.', 'German UI, GDPR and EU hosting may be missing.'],
    questions: ['Which existing system (POS, Lokka) does it need to talk to?', 'Who provides support in German?', 'Is there an open API or SDK?'],
    reg: ['CE', 'ROHS', 'WEEE'], risk: 'medium',
  },
  industry: {
    adv: ['High value per unit.', 'Strong learning value for own product development.'],
    dis: ['High capital and service requirement.', 'Machinery safety and CE documentation are complex.'],
    questions: ['Is this research or a concrete business case?', 'Who would install and service it in Germany?', 'What is the real total cost including shipping and customs?'],
    reg: ['CE', 'DOC'], risk: 'high',
  },
  trading: {
    adv: ['Simple to resell online and in shops.', 'Private label is usually possible.'],
    dis: ['Strong price competition on Amazon.', 'Easy for competitors to copy.'],
    questions: ['How many similar offers exist on Amazon DE?', 'What makes this version better than the cheapest one?', 'Can you test demand with a small first order?'],
    reg: ['CE', 'WEEE'], risk: 'medium',
  },
  retail: {
    adv: ['Fits kiosk and gastro use cases directly.', 'Hardware plus software can create recurring revenue.'],
    dis: ['Payment and fiscal rules in Germany (TSE) are strict.', 'Installation and support on site needed.'],
    questions: ['Does it accept German payment methods (EC card)?', 'Is it compliant with German fiscal rules?', 'Could you test it in the kiosk first?'],
    reg: ['CE', 'ROHS', 'WEEE'], risk: 'high',
  },
  energy: {
    adv: ['Growing demand for energy saving in Germany.', 'Higher price point allows good absolute margin.'],
    dis: ['Batteries bring transport and regulatory duties.', 'Certifications (VDE, grid rules) take time.'],
    questions: ['Which certificates are already available?', 'Is installation by an electrician needed?', 'How is lithium battery shipping handled?'],
    reg: ['CE', 'BATTERY', 'WEEE', 'ROHS'], risk: 'high',
  },
  school_office: {
    adv: ['Predictable seasonal demand.', 'Good private label potential.'],
    dis: ['Strong seasonality around school start.', 'Children\'s products have extra safety rules.'],
    questions: ['Is it intended for children under 14?', 'Does it fit German school requirements?', 'Can stock be sold outside the season?'],
    reg: ['TOY', 'REACH', 'CE'], risk: 'medium',
  },
  care_fitness: {
    adv: ['Emotional product with strong social media potential.', 'Good margins in the premium segment.'],
    dis: ['Health claims can trigger medical device rules.', 'Cosmetics need a safety assessment.'],
    questions: ['Does the seller make medical claims?', 'Can you test it yourself for a week?', 'Who is the EU responsible person?'],
    reg: ['CE', 'COSMETICS', 'MEDICAL'], risk: 'medium',
  },
  idea: {
    adv: ['No inventory needed to start exploring.', 'Can inspire own products or services.'],
    dis: ['Value is still unproven.', 'Needs your own time to develop.'],
    questions: ['What specific problem does it solve?', 'Can you build a first test in a weekend?', 'Who would pay for it?'],
    reg: [], risk: 'unknown',
  },
};

const FOOD_EQUIPMENT = {
  adv: ['Saves staff time on a repetitive kitchen task.', 'Can be tested directly in a real kitchen (Babel).'],
  dis: ['Spare parts and service in Germany are unclear.', 'Machinery and food-contact rules apply (CE, materials).'],
  questions: ['How many minutes per day would it save at Babel?', 'Who repairs it in Germany if it breaks?', 'Are the food-contact parts certified for the EU?'],
  reg: ['CE', 'DOC', 'FOOD'] as RegTopicId[], risk: 'medium' as RiskLevel,
};

const GENERIC = {
  adv: ['Seen live at the fair.', 'Supplier contact available.'],
  dis: ['Category not set yet.', 'Little information captured so far.'],
  questions: ['What specific problem does it solve?', 'Why would a German customer pay for it?', 'What is the biggest import obstacle?'],
};

function displayName(p: Product): string {
  return p.name.trim() || 'This product';
}

/** Realistic, deterministic results without any API key. Clearly labelled as "Demo AI" in the UI. */
export const mockProvider: AiProvider = {
  id: 'mock',
  label: 'Demo AI (offline rules)',

  async structureCapture(input: CaptureInput) {
    await delay(250);
    return parseVoiceNote(input.transcript);
  },

  async readBusinessCard() {
    await delay(400);
    return {
      company: 'Shenzhen Demo Technology Co., Ltd.',
      contactPerson: 'Lily Chen',
      position: 'Sales Manager',
      phone: '+86 138 0000 0000',
      email: 'lily.chen@example.com',
      website: 'www.example.com',
      wechat: 'lily_demo_88',
      address: 'Bao\'an District, Shenzhen',
    };
  },

  async analyzeProduct(p: Product): Promise<AnalysisResult> {
    await delay(500);
    const equipment = p.categoryId === 'food' && p.categoryAnswers.type === 'industrial_gastro_equipment';
    const traits = equipment ? FOOD_EQUIPMENT : p.categoryId ? CATEGORY_TRAITS[p.categoryId] : null;
    const cat = p.categoryId ? CATEGORY_MAP[p.categoryId].label : 'an uncategorised product';
    const type = productType(p.categoryId, p.categoryAnswers);
    const markets = p.targetMarkets.length ? p.targetMarkets.join(', ').replace('DE', 'Germany').replace('SY', 'Syria') : 'an open market';
    const price = p.pricing.supplierPrice ? `${p.pricing.supplierPrice} ${p.pricing.currency}` : 'Unknown';
    const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
    const kind = type ? `${article(type)} ${type.toLowerCase()} product in ${cat}` : cat;
    const summary = `${displayName(p)} is ${kind}, noted for ${markets}. Supplier price: ${price}.`;
    const questions = [...(traits?.questions ?? GENERIC.questions)];
    if (p.projects.includes('babel')) questions.unshift('Can you test it at Babel within the first month?');
    if (p.oem) questions.push('Can you build a private-label version at an acceptable MOQ?');
    return {
      summary,
      advantages: traits?.adv ?? GENERIC.adv,
      disadvantages: traits?.dis ?? GENERIC.dis,
      questions: questions.slice(0, 4),
      regulatoryHint: traits ? { risk: traits.risk, topics: traits.reg } : undefined,
    };
  },

  async scoreProduct(p: Product): Promise<ScoreResult> {
    await delay(500);
    const c = p.categoryId;
    const forDe = p.targetMarkets.includes('DE');
    const pl = p.oem === true || p.categoryAnswers.private_label === true;
    const margin = p.pricing.supplierPrice && p.pricing.targetSellingPrice
      ? clamp(((p.pricing.targetSellingPrice - p.pricing.supplierPrice) / p.pricing.targetSellingPrice) * 14)
      : 5;
    const heavy = c === 'industry' || c === 'energy' || c === 'retail';
    const dims: Record<ScoreDimension, number> = {
      germanyDemand: clamp((forDe ? 6 : 4) + (p.interest >= 4 ? 1 : 0)),
      competition: clamp(c === 'trading' || c === 'packaging' ? 3 : c === 'idea' ? 7 : 5),
      margin,
      startupCapital: clamp(heavy ? 3 : c === 'idea' ? 8 : 6),
      scalability: clamp(c === 'automation' ? 8 : heavy ? 4 : 6),
      regulatoryEffort: clamp({ low: 8, medium: 5, high: 2, unknown: 5 }[p.regulatory.risk]),
      importComplexity: clamp(heavy ? 3 : c === 'food' ? 4 : 6),
      privateLabel: clamp(pl ? 8 : c === 'industry' ? 2 : 5),
      personalFit: clamp(3 + p.projects.length + Math.round(p.interest / 2)),
    };
    const best = (Object.entries(dims) as [ScoreDimension, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const worst = (Object.entries(dims) as [ScoreDimension, number][]).sort((a, b) => a[1] - b[1])[0][0];
    const why = `Demo estimate from the data you captured, not a market analysis. Strongest point: ${best.replace(/([A-Z])/g, ' $1').toLowerCase()}. `
      + `Weakest point: ${worst.replace(/([A-Z])/g, ' $1').toLowerCase()}. Missing prices or supplier data lower the confidence.`;
    return { dims, why };
  },
};
