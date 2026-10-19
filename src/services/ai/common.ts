import { z } from 'zod';
import { CATEGORIES, CATEGORY_MAP } from '../../constants/categories';
import { PROJECTS, PURPOSES, REG_TOPICS, SEASONS } from '../../constants/options';
import type { CategoryId, ContactSuggestion, Product, RegTopicId, StructuredSuggestion } from '../../types/models';
import { SCORE_DIMENSIONS } from '../../types/models';
import type { AnalysisResult, CaptureInput, ScoreResult } from './types';

/** Shared by every real AI provider: prompts, output schemas and the mapping into app types. */

export const SYSTEM = `You help a German entrepreneur capture products at trade fairs in China and review them later.
Rules:
- Never invent facts. If something is not stated in the input or clearly visible in the image, return null (unknown).
- Do not estimate prices, MOQs or numbers unless they are explicitly given.
- The user speaks German; all output text must be in English.
- Keep text short and concrete. This is not legal advice.`;

const ids = <T extends { id: string }>(list: T[]) => list.map((o) => o.id) as [string, ...string[]];

export const CaptureSchema = z.object({
  title: z.string().nullable().describe('Short English product title, 2-6 words, from what was said or seen. null if unclear'),
  description: z.string().nullable().describe('1-3 short English sentences describing what the product is and what was said about it. Only facts from the input. null if nothing was said or seen'),
  categoryId: z.enum(ids(CATEGORIES)).nullable(),
  typeAnswer: z.string().nullable().describe('Option id of the category type question, from the catalogue'),
  targetMarkets: z.array(z.enum(['DE', 'SY', 'OTHER', 'MULTI'])),
  otherCountries: z.array(z.string()),
  businessType: z.enum(['B2B', 'B2C', 'B2B2C']).nullable(),
  projects: z.array(z.enum(ids(PROJECTS))),
  purposes: z.array(z.enum(ids(PURPOSES))),
  seasons: z.array(z.enum(ids(SEASONS))),
  priceAmount: z.number().nullable(),
  priceCurrency: z.enum(['EUR', 'USD', 'CNY']).nullable(),
  moq: z.number().nullable(),
  oem: z.boolean().nullable(),
  interest: z.number().int().min(1).max(5).nullable().describe('Only if the user clearly expresses enthusiasm level'),
  supplierCompany: z.string().nullable(),
});

export const CardSchema = z.object({
  company: z.string().nullable(),
  contactPerson: z.string().nullable(),
  position: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  wechat: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
});

export const AnalysisSchema = z.object({
  summary: z.string().describe('Max 2 sentences'),
  advantages: z.array(z.string()).describe('Exactly 2, very short'),
  disadvantages: z.array(z.string()).describe('Exactly 2, very short'),
  questions: z.array(z.string()).describe('2-4 product-specific reflection questions'),
  regulatoryRisk: z.enum(['low', 'medium', 'high', 'unknown']),
  regulatoryTopics: z.array(z.enum(ids(REG_TOPICS))),
});

export const ScoreSchema = z.object({
  ...Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, z.number().int().min(0).max(10)])) as Record<(typeof SCORE_DIMENSIONS)[number], z.ZodNumber>,
  why: z.string().describe('2-4 sentences'),
});

export const TranslateSchema = z.object({
  translations: z.array(z.string()).describe('Same length and order as the input strings'),
});

function catalogue(): string {
  return CATEGORIES.map((c) => {
    const typeQ = c.questions.find((q) => q.id === c.typeQuestionId);
    return `${c.id} (${c.label}): type options = ${typeQ?.options?.map((o) => o.id).join(', ')}`;
  }).join('\n');
}

/** Only what the model needs: no ids, photos or history. */
export function productFacts(p: Product): string {
  const cat = p.categoryId ? CATEGORY_MAP[p.categoryId].label : 'unknown';
  return JSON.stringify({
    name: p.name || null, description: p.description || null, category: cat, categoryAnswers: p.categoryAnswers, notes: p.notes || null,
    voiceNote: p.voiceTranscript || null, targetMarkets: p.targetMarkets, otherCountries: p.otherCountries,
    businessType: p.businessType, seasons: p.seasons, purposes: p.purposes, projects: p.projects,
    supplierCompany: p.supplier.company || null, pricing: p.pricing, oem: p.oem, myInterest: p.interest || null,
    regulatory: p.regulatory,
  });
}

export const capturePrompt = (input: CaptureInput) =>
  `Extract structured fields from this trade-fair voice note${input.productPhoto ? ' and product photo' : ''}.\n`
  + 'Give a short English title and a short English description based on what was said and what is visible.\n'
  + `Category catalogue:\n${catalogue()}\n\nVoice note (German or English):\n"""${input.transcript || '(none, use the photo only)'}"""`;

export const cardPrompt =
  'Read this business card / contact sheet. Return only text that is printed on it. Use Latin script where the card offers it; otherwise copy the original.';

export const analysisPrompt = (p: Product) =>
  `Analyse this product for import/resale or own-product decisions in the target markets.\nKnown data:\n${productFacts(p)}\n`
  + 'Give exactly 2 advantages and 2 disadvantages. Regulatory topics are hints, not legal advice.';

export const scorePrompt = (p: Product) =>
  'Score this product 0-10 on each dimension. 10 always means favourable for the user '
  + '(e.g. competition 10 = little competition, regulatoryEffort 10 = little effort, startupCapital 10 = little capital needed).\n'
  + `Base it only on the data; where data is missing, stay near 5 and say so in "why".\nData:\n${productFacts(p)}`;

export const translatePrompt = (strings: string[]) =>
  'Translate each of these interface and content strings to Arabic (Modern Standard Arabic, natural and short). '
  + 'Keep brand and product names (EasyFair, Babel, Lokka, Jajehelp), company names, numbers, currencies, units, URLs, emails and codes unchanged. '
  + 'Keep leading symbols such as stars, arrows or emoji. Return exactly one translation per input, same order.\n'
  + `Input (JSON array):\n${JSON.stringify(strings)}`;

export function mapCapture(r: z.infer<typeof CaptureSchema>): StructuredSuggestion {
  const out: StructuredSuggestion = {};
  if (r.title) out.name = r.title;
  if (r.description) out.description = r.description;
  if (r.categoryId) {
    out.categoryId = r.categoryId as CategoryId;
    const cat = CATEGORY_MAP[out.categoryId];
    const typeQ = cat.questions.find((q) => q.id === cat.typeQuestionId);
    if (r.typeAnswer && typeQ?.options?.some((o) => o.id === r.typeAnswer)) out.categoryAnswers = { [cat.typeQuestionId]: r.typeAnswer };
  }
  if (r.targetMarkets.length) out.targetMarkets = r.targetMarkets;
  if (r.otherCountries.length) out.otherCountries = r.otherCountries;
  if (r.businessType) out.businessType = r.businessType;
  if (r.projects.length) out.projects = r.projects as StructuredSuggestion['projects'];
  if (r.purposes.length) out.purposes = r.purposes as StructuredSuggestion['purposes'];
  if (r.seasons.length) out.seasons = r.seasons as StructuredSuggestion['seasons'];
  if (r.priceAmount != null && r.priceCurrency) out.price = { amount: r.priceAmount, currency: r.priceCurrency };
  if (r.moq != null) out.moq = r.moq;
  if (r.oem != null) out.oem = r.oem;
  if (r.interest != null) out.interest = r.interest;
  if (r.supplierCompany) out.supplierCompany = r.supplierCompany;
  return out;
}

export const mapCard = (r: z.infer<typeof CardSchema>): ContactSuggestion =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => v)) as ContactSuggestion;

export const mapAnalysis = (r: z.infer<typeof AnalysisSchema>): AnalysisResult => ({
  summary: r.summary,
  advantages: r.advantages.slice(0, 2),
  disadvantages: r.disadvantages.slice(0, 2),
  questions: r.questions.slice(0, 4),
  regulatoryHint: { risk: r.regulatoryRisk, topics: r.regulatoryTopics as RegTopicId[] },
});

export function mapScore(r: z.infer<typeof ScoreSchema>): ScoreResult {
  const { why, ...dims } = r;
  return { dims: dims as ScoreResult['dims'], why };
}

/** Translates in chunks so one long page never exceeds the output limit. */
export async function translateInChunks(strings: string[], run: (chunk: string[]) => Promise<string[]>, size = 50): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < strings.length; i += size) {
    const chunk = strings.slice(i, i + size);
    const res = await run(chunk);
    out.push(...chunk.map((s, j) => res[j] ?? s));
  }
  return out;
}
