import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { CATEGORIES, CATEGORY_MAP } from '../../constants/categories';
import { PROJECTS, PURPOSES, REG_TOPICS, SEASONS } from '../../constants/options';
import type { CategoryId, ContactSuggestion, Product, RegTopicId, StructuredSuggestion } from '../../types/models';
import { SCORE_DIMENSIONS } from '../../types/models';
import { blobToBase64 } from '../images';
import { AiError, type AiProvider, type AnalysisResult, type CaptureInput, type ScoreResult } from './types';

const SYSTEM = `You help a German entrepreneur capture products at trade fairs in China and review them later.
Rules:
- Never invent facts. If something is not stated in the input or clearly visible in the image, return null (unknown).
- Do not estimate prices, MOQs or numbers unless they are explicitly given.
- The user speaks German; all output text must be in English.
- Keep text short and concrete. This is not legal advice.`;

const ids = <T extends { id: string }>(list: T[]) => list.map((o) => o.id) as [string, ...string[]];

const CaptureSchema = z.object({
  name: z.string().nullable().describe('Short English product name, null if unclear'),
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

const CardSchema = z.object({
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

const AnalysisSchema = z.object({
  summary: z.string().describe('Max 2 sentences'),
  advantages: z.array(z.string()).describe('Exactly 2, very short'),
  disadvantages: z.array(z.string()).describe('Exactly 2, very short'),
  questions: z.array(z.string()).describe('2-4 product-specific reflection questions'),
  regulatoryRisk: z.enum(['low', 'medium', 'high', 'unknown']),
  regulatoryTopics: z.array(z.enum(ids(REG_TOPICS))),
});

const ScoreSchema = z.object({
  ...Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, z.number().int().min(0).max(10)])) as Record<(typeof SCORE_DIMENSIONS)[number], z.ZodNumber>,
  why: z.string().describe('2-4 sentences'),
});

function catalogue(): string {
  return CATEGORIES.map((c) => {
    const typeQ = c.questions.find((q) => q.id === c.typeQuestionId);
    return `${c.id} (${c.label}): type options = ${typeQ?.options?.map((o) => o.id).join(', ')}`;
  }).join('\n');
}

/** Only what the model needs: no ids, photos or history. */
function productFacts(p: Product): string {
  const cat = p.categoryId ? CATEGORY_MAP[p.categoryId].label : 'unknown';
  return JSON.stringify({
    name: p.name || null, category: cat, categoryAnswers: p.categoryAnswers, notes: p.notes || null,
    voiceNote: p.voiceTranscript || null, targetMarkets: p.targetMarkets, otherCountries: p.otherCountries,
    businessType: p.businessType, seasons: p.seasons, purposes: p.purposes, projects: p.projects,
    supplierCompany: p.supplier.company || null, pricing: p.pricing, oem: p.oem, myInterest: p.interest || null,
    regulatory: p.regulatory,
  });
}

async function imageBlock(blob: Blob): Promise<Anthropic.ImageBlockParam> {
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await blobToBase64(blob) } };
}

function friendly(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) return new AiError('Your Claude API key was rejected. Check it in Settings.');
  if (err instanceof Anthropic.RateLimitError) return new AiError('Claude is busy (rate limit). Try again in a minute.');
  if (err instanceof Anthropic.APIConnectionError) return new AiError('No connection to Claude. Your data is saved; try again when online (VPN on?).');
  if (err instanceof Anthropic.APIError) return new AiError(`Claude could not answer right now (${err.status ?? 'error'}). Your data is saved.`);
  return new AiError('AI analysis failed. Your data is saved.');
}

export function createAnthropicProvider(apiKey: string, model: string): AiProvider {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 });
  // Haiku 4.5 does not accept `effort`; the others run at low effort for speed and cost.
  const effort = model.startsWith('claude-haiku') ? undefined : ('low' as const);

  async function ask<S extends z.ZodType>(schema: S, content: Anthropic.ContentBlockParam[], maxTokens = 4000): Promise<z.infer<S>> {
    try {
      const res = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        system: SYSTEM,
        messages: [{ role: 'user', content }],
        output_config: { format: zodOutputFormat(schema), ...(effort ? { effort } : {}) },
      });
      if (res.stop_reason === 'refusal' || !res.parsed_output) throw new AiError('Claude returned no usable answer. Try again.');
      return res.parsed_output as z.infer<S>;
    } catch (err) {
      if (err instanceof AiError) throw err;
      throw friendly(err);
    }
  }

  return {
    id: 'anthropic',
    label: `Claude (${model})`,

    async structureCapture(input: CaptureInput): Promise<StructuredSuggestion> {
      const content: Anthropic.ContentBlockParam[] = [];
      if (input.productPhoto) content.push(await imageBlock(input.productPhoto));
      content.push({ type: 'text', text:
        `Extract structured fields from this trade-fair voice note${input.productPhoto ? ' and product photo' : ''}.\n`
        + `Category catalogue:\n${catalogue()}\n\nVoice note (German or English):\n"""${input.transcript}"""` });
      const r = await ask(CaptureSchema, content);
      const out: StructuredSuggestion = {};
      if (r.name) out.name = r.name;
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
    },

    async readBusinessCard(photo: Blob): Promise<ContactSuggestion> {
      const r = await ask(CardSchema, [await imageBlock(photo), { type: 'text', text:
        'Read this business card / contact sheet. Return only text that is printed on it. Use Latin script where the card offers it; otherwise copy the original.' }], 2000);
      return Object.fromEntries(Object.entries(r).filter(([, v]) => v)) as ContactSuggestion;
    },

    async analyzeProduct(p: Product, productPhoto?: Blob, infoPhoto?: Blob): Promise<AnalysisResult> {
      const content: Anthropic.ContentBlockParam[] = [];
      if (productPhoto) content.push(await imageBlock(productPhoto));
      if (infoPhoto) content.push(await imageBlock(infoPhoto));
      content.push({ type: 'text', text:
        `Analyse this product for import/resale or own-product decisions in the target markets.\nKnown data:\n${productFacts(p)}\n`
        + 'Give exactly 2 advantages and 2 disadvantages. Regulatory topics are hints, not legal advice.' });
      const r = await ask(AnalysisSchema, content);
      return {
        summary: r.summary,
        advantages: r.advantages.slice(0, 2),
        disadvantages: r.disadvantages.slice(0, 2),
        questions: r.questions.slice(0, 4),
        regulatoryHint: { risk: r.regulatoryRisk, topics: r.regulatoryTopics as RegTopicId[] },
      };
    },

    async scoreProduct(p: Product): Promise<ScoreResult> {
      const r = await ask(ScoreSchema, [{ type: 'text', text:
        `Score this product 0-10 on each dimension. 10 always means favourable for the user `
        + `(e.g. competition 10 = little competition, regulatoryEffort 10 = little effort, startupCapital 10 = little capital needed).\n`
        + `Base it only on the data; where data is missing, stay near 5 and say so in "why".\nData:\n${productFacts(p)}` }]);
      const { why, ...dims } = r;
      return { dims: dims as ScoreResult['dims'], why };
    },
  };
}
