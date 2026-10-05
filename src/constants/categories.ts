import type { AnswerValue, CategoryId } from '../types/models';
import type { Option } from './options';

export type QuestionKind = 'single' | 'multi' | 'bool' | 'number' | 'text';

export interface Question {
  id: string;
  label: string;
  kind: QuestionKind;
  options?: Option[];
  /** Only shown when another answer matches one of these option ids. */
  showIf?: { q: string; in: string[] };
  /** Shown on the fair (quick) screen. Everything else lives under "More details". */
  quick?: boolean;
  unit?: string;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string;
  /** Answer of this question is the product "type" (subcategory) used in filters and PDF. */
  typeQuestionId: string;
  questions: Question[];
}

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
/** "A|B|C" -> options with stable ids derived from the labels. */
const opts = (labels: string): Option[] => labels.split('|').map((label) => ({ id: slug(label), label }));

const q = (id: string, label: string, kind: QuestionKind, extra: Partial<Question> = {}): Question => ({ id, label, kind, ...extra });
const when = (qid: string, ...ids: string[]) => ({ showIf: { q: qid, in: ids } });

const MOQ = q('moq_known', 'MOQ known?', 'bool');
const PRIVATE_LABEL = q('private_label', 'Private label possible?', 'bool', { quick: true });
const CERTS = q('certs', 'Certificates seen', 'multi', { options: opts('CE|RoHS|FDA|LFGB|ISO 9001|UL|None seen') });

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'food', label: 'Food & Gastro', icon: '🍜', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true, options: opts('Trading goods|Industrial / Gastro equipment') }),
      q('food_kind', 'Kind', 'single', { quick: true, ...when('type', 'trading_goods'),
        options: opts('Innovative food|Gastro ingredients|Snacks|Beverages|Sweets|Instant / Convenience|Shelf-stable food') }),
      q('storage', 'Storage', 'single', { quick: true, ...when('type', 'trading_goods'), options: opts('Shelf stable|Refrigerated|Frozen') }),
      q('shelf_life', 'Shelf life', 'text', { ...when('type', 'trading_goods'), unit: 'months' }),
      q('halal', 'Halal certified?', 'bool', when('type', 'trading_goods')),
      q('allergens', 'Allergens', 'multi', { ...when('type', 'trading_goods'), options: opts('Gluten|Milk|Nuts|Soy|Egg|Sesame|None|Unknown') }),
      q('food_packaging', 'Packaging', 'single', { ...when('type', 'trading_goods'), options: opts('Single portion|Retail pack|Bulk / Gastro|Other') }),
      q('target_customer', 'Target customer', 'multi', { ...when('type', 'trading_goods'), options: opts('Restaurants|Retail|Kiosk|End consumer|Wholesale') }),
      { ...PRIVATE_LABEL, ...when('type', 'trading_goods') },
      q('equipment_kind', 'Equipment', 'single', { quick: true, ...when('type', 'industrial_gastro_equipment'),
        options: opts('Food robot|Kitchen machine|Dispenser|Beverage machine|Packaging machine|Cooling / storage|Other equipment') }),
      q('power', 'Power supply', 'single', { ...when('type', 'industrial_gastro_equipment'), options: opts('230V|400V (3-phase)|Gas|Manual|Unknown') }),
      q('capacity', 'Capacity / output', 'text', when('type', 'industrial_gastro_equipment')),
      q('cleaning', 'Easy to clean (HACCP)?', 'bool', when('type', 'industrial_gastro_equipment')),
      q('spare_parts', 'Spare parts / service in EU?', 'bool', when('type', 'industrial_gastro_equipment')),
      MOQ,
    ],
  },
  {
    id: 'packaging', label: 'Packaging', icon: '📦', typeQuestionId: 'purpose',
    questions: [
      q('purpose', 'What is it for?', 'single', { quick: true, options: opts('Food|Beverage|Trading goods|Industrial goods|Shipping|Other') }),
      q('temp', 'Hot / cold', 'single', { quick: true, ...when('purpose', 'food', 'beverage'), options: opts('Hot|Cold|Both') }),
      q('content_state', 'Liquid / solid', 'single', { ...when('purpose', 'food', 'beverage'), options: opts('Liquid|Solid|Both') }),
      q('food_contact', 'Direct food contact?', 'bool', when('purpose', 'food', 'beverage')),
      q('takeaway', 'Take-away?', 'bool', when('purpose', 'food', 'beverage')),
      q('microwave', 'Microwave safe?', 'bool', when('purpose', 'food')),
      q('freezer', 'Freezer safe?', 'bool', when('purpose', 'food')),
      q('reuse', 'Disposable / reusable', 'single', { quick: true, options: opts('Disposable|Reusable') }),
      q('material', 'Material', 'multi', { quick: true, options: opts('Paper / cardboard|Bagasse / fibre|PLA (bio)|PP|PET|Aluminium|Glass|Other') }),
      q('branding', 'Custom branding possible?', 'bool'),
      MOQ,
    ],
  },
  {
    id: 'automation', label: 'Automation', icon: '⚙️', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true, options: opts('Software|Hardware') }),
      q('software_kind', 'Software', 'multi', { quick: true, ...when('type', 'software'), options: opts('POS|Inventory|Warehouse|Production|HR|AI|CRM|Planning') }),
      q('hosting', 'Hosting', 'single', { ...when('type', 'software'), options: opts('Cloud|On-premise|Hybrid|Unknown') }),
      q('pricing_model', 'Pricing model', 'single', { ...when('type', 'software'), options: opts('Subscription|One-time licence|Per device|Unknown') }),
      q('languages', 'German / English UI?', 'bool', when('type', 'software')),
      q('gdpr', 'EU servers / GDPR mentioned?', 'bool', when('type', 'software')),
      q('hardware_kind', 'Hardware', 'multi', { quick: true, ...when('type', 'hardware'), options: opts('Sensors|Cameras|RFID/NFC|Weight|Motors|Actuators|Controllers') }),
      q('interfaces', 'Interfaces', 'multi', { ...when('type', 'hardware'), options: opts('USB|Ethernet|WiFi|Bluetooth|RS485 / Modbus|API / SDK') }),
      q('sdk', 'Open API / SDK?', 'bool', { quick: true }),
      q('integrations', 'Existing integrations', 'text'),
    ],
  },
  {
    id: 'industry', label: 'Industry', icon: '🏭', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true, options: opts('Grippers|Robots|CNC|Conveyors|Production machines|Machine vision|Other') }),
      q('interest', 'Interest', 'single', { quick: true, options: opts('Idea only|Serious research') }),
      q('payload', 'Payload / size', 'text', when('type', 'grippers', 'robots', 'conveyors')),
      q('programming', 'Programming', 'single', { ...when('type', 'robots', 'cnc'), options: opts('Teach pendant|Graphical / no-code|Code / SDK|Unknown') }),
      q('demo_seen', 'Saw it running?', 'bool'),
      q('ce_marked', 'CE marked?', 'bool'),
      q('price_range', 'Price range', 'single', { options: opts('< €1k|€1k-10k|€10k-50k|> €50k|Unknown') }),
    ],
  },
  {
    id: 'trading', label: 'Trading Goods', icon: '🛍️', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true,
        options: opts('Electronics|Everyday products|Household|Kitchen|Travel|Car|Leisure|Pet|Sports|Smart Home|IoT|Other') }),
      q('battery', 'Contains battery?', 'bool', { quick: true, ...when('type', 'electronics', 'smart_home', 'iot', 'car', 'pet', 'travel', 'sports') }),
      q('app', 'Needs an app?', 'bool', when('type', 'smart_home', 'iot', 'electronics', 'pet')),
      q('app_eu', 'App works in EU without Chinese account?', 'bool', when('type', 'smart_home', 'iot')),
      q('food_contact', 'Food contact?', 'bool', when('type', 'kitchen', 'household')),
      q('kids', 'For children?', 'bool', when('type', 'leisure', 'everyday_products', 'household')),
      q('size', 'Shipping size', 'single', { options: opts('Small (letter)|Medium (parcel)|Bulky|Unknown') }),
      q('amazon', 'Seen on Amazon DE?', 'single', { options: opts('Yes, many|Yes, few|No|Unknown') }),
      PRIVATE_LABEL,
      CERTS,
    ],
  },
  {
    id: 'retail', label: 'Smart Retail / Vending', icon: '🏪', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true,
        options: opts('Self Checkout|Vending machines|Weight sensors|Cameras|RFID|NFC|QR|Payment|Digital price labels|Automated inventory') }),
      q('installation', 'Installation required?', 'bool', { quick: true }),
      q('software', 'Software included?', 'bool', { quick: true }),
      q('subscription', 'Subscription?', 'bool'),
      q('hardware_only', 'Hardware only?', 'bool'),
      q('target_customer', 'Target customer', 'multi', { options: opts('Kiosk|Restaurant|Supermarket|Office|Hotel|Other') }),
      q('integrations', 'Existing integrations', 'text'),
      q('payments', 'Payment systems', 'multi', { ...when('type', 'self_checkout', 'vending_machines', 'payment'),
        options: opts('Cash|EC / Girocard|Visa / Mastercard|Apple / Google Pay|WeChat / Alipay only') }),
      q('fiscal', 'German TSE / fiscal compliant?', 'bool', when('type', 'self_checkout', 'payment', 'vending_machines')),
    ],
  },
  {
    id: 'energy', label: 'Energy', icon: '⚡', typeQuestionId: 'type',
    questions: [
      q('type', 'Type', 'single', { quick: true,
        options: opts('Energy monitoring|Smart meters|Electricity measurement|Batteries|Power stations|Chargers|Solar|Energy storage|Load management') }),
      q('battery', 'Battery?', 'bool', { quick: true }),
      q('lithium', 'Lithium?', 'bool', when('battery', 'true')),
      q('capacity', 'Capacity', 'text', { unit: 'kWh / W' }),
      q('location', 'Indoor / outdoor', 'single', { options: opts('Indoor|Outdoor|Both') }),
      q('segment', 'Residential / commercial', 'single', { quick: true, options: opts('Residential|Commercial|Both') }),
      q('grid', 'Grid connected?', 'bool'),
      q('installation', 'Installation by electrician?', 'bool'),
      q('certs', 'Certifications', 'multi', { options: opts('CE|VDE|TÜV|UN38.3|IEC 62619|None seen') }),
    ],
  },
  {
    id: 'school_office', label: 'School & Office', icon: '🎒', typeQuestionId: 'area',
    questions: [
      q('area', 'Area', 'single', { quick: true, options: opts('School|Office') }),
      q('school_kind', 'School', 'single', { quick: true, ...when('area', 'school'), options: opts('Backpacks|Learning systems|Stationery|Learning toys|STEM') }),
      q('age', 'Age group', 'single', { ...when('area', 'school'), options: opts('3-6|6-10|10-14|14+') }),
      q('electronic', 'Electronic?', 'bool', when('school_kind', 'learning_systems', 'learning_toys', 'stem')),
      q('curriculum', 'Fits German curriculum?', 'single', { ...when('school_kind', 'learning_systems', 'stem'), options: opts('Yes|Partly|No|Unknown') }),
      q('office_kind', 'Office', 'single', { quick: true, ...when('area', 'office'), options: opts('Organization|Desk|Ergonomics|Tech accessories|Storage') }),
      q('b2b_bulk', 'Corporate bulk orders?', 'bool', when('area', 'office')),
      PRIVATE_LABEL,
    ],
  },
  {
    id: 'care_fitness', label: 'Personal Care & Fitness', icon: '💪', typeQuestionId: 'area',
    questions: [
      q('area', 'Area', 'single', { quick: true, options: opts('Personal Care|Fitness') }),
      q('care_kind', 'Personal care', 'single', { quick: true, ...when('area', 'personal_care'), options: opts('Body care|Hair|Grooming|Beauty|Devices') }),
      q('skin_contact', 'Applied to skin (cosmetic)?', 'bool', when('care_kind', 'body_care', 'hair', 'beauty')),
      q('fitness_kind', 'Fitness', 'single', { quick: true, ...when('area', 'fitness'), options: opts('Training|Recovery|Mobility|Accessories|Outdoor') }),
      q('electronic', 'Electronic device?', 'bool', { quick: true }),
      q('medical_claim', 'Makes health / medical claims?', 'bool'),
      q('gender', 'Target group', 'single', { options: opts('Women|Men|Unisex') }),
      PRIVATE_LABEL,
    ],
  },
  {
    id: 'idea', label: 'Individual Idea', icon: '💡', typeQuestionId: 'idea_type',
    questions: [
      q('idea_type', 'Idea type', 'single', { quick: true, options: opts('Product|Service|Software|Business model|Marketing') }),
      q('inspired_by', 'Inspired by', 'text', { quick: true }),
      q('build_self', 'Can I build or test it myself?', 'single', { options: opts('Yes|With help|No') }),
      q('effort', 'Effort', 'single', { options: opts('Weekend|Weeks|Months') }),
    ],
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;

function matches(answer: AnswerValue | undefined, ids: string[]): boolean {
  if (answer === undefined) return false;
  if (Array.isArray(answer)) return answer.some((a) => ids.includes(a));
  return ids.includes(String(answer));
}

export function visibleQuestions(categoryId: CategoryId | null, answers: Record<string, AnswerValue>): Question[] {
  if (!categoryId) return [];
  return CATEGORY_MAP[categoryId].questions.filter((qq) => !qq.showIf || matches(answers[qq.showIf.q], qq.showIf.in));
}

/** Drops answers whose question is no longer visible (e.g. after switching type). */
export function pruneAnswers(categoryId: CategoryId | null, answers: Record<string, AnswerValue>): Record<string, AnswerValue> {
  let current = answers;
  for (let i = 0; i < 4; i++) {
    const ids = new Set(visibleQuestions(categoryId, current).map((qq) => qq.id));
    const next = Object.fromEntries(Object.entries(current).filter(([k]) => ids.has(k)));
    if (Object.keys(next).length === Object.keys(current).length) return next;
    current = next;
  }
  return current;
}

export function productType(categoryId: CategoryId | null, answers: Record<string, AnswerValue>): string {
  if (!categoryId) return '';
  const cat = CATEGORY_MAP[categoryId];
  const typeQ = cat.questions.find((qq) => qq.id === cat.typeQuestionId);
  const val = answers[cat.typeQuestionId];
  return typeQ?.options?.find((o) => o.id === val)?.label ?? '';
}

export function answerLabel(question: Question, value: AnswerValue | undefined): string {
  if (value === undefined || value === '') return '';
  if (question.kind === 'bool') return value === true || value === 'true' ? 'Yes' : 'No';
  const find = (id: string) => question.options?.find((o) => o.id === id)?.label ?? id;
  if (Array.isArray(value)) return value.map(find).join(', ');
  if (question.options) return find(String(value));
  return question.unit ? `${value} ${question.unit}` : String(value);
}
