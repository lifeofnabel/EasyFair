import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { blobToBase64 } from '../images';
import {
  AnalysisSchema, CaptureSchema, CardSchema, SYSTEM, ScoreSchema, TranslateSchema,
  analysisPrompt, capturePrompt, cardPrompt, mapAnalysis, mapCapture, mapCard, mapScore, scorePrompt, translateInChunks, translatePrompt,
} from './common';
import { AiError, type AiProvider, type CaptureInput } from './types';

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

    async structureCapture(input: CaptureInput) {
      const content: Anthropic.ContentBlockParam[] = [];
      if (input.productPhoto) content.push(await imageBlock(input.productPhoto));
      content.push({ type: 'text', text: capturePrompt(input) });
      return mapCapture(await ask(CaptureSchema, content));
    },

    async readBusinessCard(photo: Blob) {
      return mapCard(await ask(CardSchema, [await imageBlock(photo), { type: 'text', text: cardPrompt }], 2000));
    },

    async analyzeProduct(p, productPhoto, infoPhoto) {
      const content: Anthropic.ContentBlockParam[] = [];
      if (productPhoto) content.push(await imageBlock(productPhoto));
      if (infoPhoto) content.push(await imageBlock(infoPhoto));
      content.push({ type: 'text', text: analysisPrompt(p) });
      return mapAnalysis(await ask(AnalysisSchema, content));
    },

    async scoreProduct(p) {
      return mapScore(await ask(ScoreSchema, [{ type: 'text', text: scorePrompt(p) }]));
    },

    translate: (strings) => translateInChunks(strings, async (chunk) =>
      (await ask(TranslateSchema, [{ type: 'text', text: translatePrompt(chunk) }], 8000)).translations),
  };
}
