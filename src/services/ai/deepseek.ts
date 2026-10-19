import { z } from 'zod';
import { blobToBase64 } from '../images';
import {
  AnalysisSchema, CaptureSchema, CardSchema, SYSTEM, ScoreSchema, TranslateSchema,
  analysisPrompt, capturePrompt, cardPrompt, mapAnalysis, mapCapture, mapCard, mapScore, scorePrompt, translateInChunks, translatePrompt,
} from './common';
import { AiError, type AiProvider, type CaptureInput } from './types';

const BASE = 'https://api.deepseek.com';

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' } };

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
}

const image = async (blob: Blob, detail: 'low' | 'high' = 'low'): Promise<Part> =>
  ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await blobToBase64(blob)}`, detail } });

function friendly(status: number): AiError {
  if (status === 401 || status === 403) return new AiError('Your DeepSeek API key was rejected. Check it in Settings.');
  if (status === 402) return new AiError('DeepSeek balance is empty. Top up your account.');
  if (status === 429) return new AiError('DeepSeek is busy (rate limit). Try again in a minute.');
  return new AiError(`DeepSeek could not answer right now (${status}). Your data is saved.`);
}

/**
 * DeepSeek chat API (OpenAI style) used straight from the browser. Thinking is switched off and
 * JSON mode is on: fast, cheap, and the answer is validated against the same zod schemas as Claude.
 */
export function createDeepseekProvider(apiKey: string, model: string): AiProvider {
  async function ask<S extends z.ZodType>(schema: S, content: Part[], maxTokens = 3000): Promise<z.infer<S>> {
    const jsonShape = JSON.stringify(z.toJSONSchema(schema));
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${BASE}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            stream: false,
            thinking: { type: 'disabled' },
            response_format: { type: 'json_object' },
            max_tokens: maxTokens,
            messages: [
              { role: 'system', content: `${SYSTEM}\nAnswer with one JSON object that follows this JSON schema exactly. Use null for unknown values:\n${jsonShape}` },
              { role: 'user', content },
            ],
          }),
        });
      } catch {
        throw new AiError('No connection to DeepSeek. Your data is saved; try again when online.');
      }
      if (!res.ok) throw friendly(res.status);
      const data = (await res.json()) as ChatResponse;
      const text = data.choices?.[0]?.message?.content?.trim();
      // DeepSeek can occasionally return empty content in JSON mode: one retry.
      if (!text) continue;
      try {
        return schema.parse(JSON.parse(text)) as z.infer<S>;
      } catch {
        if (attempt === 1) throw new AiError('DeepSeek returned an unreadable answer. Try again.');
      }
    }
    throw new AiError('DeepSeek returned an empty answer. Try again.');
  }

  const text = (t: string): Part => ({ type: 'text', text: t });

  return {
    id: 'deepseek',
    label: `DeepSeek (${model})`,

    async structureCapture(input: CaptureInput) {
      const content: Part[] = [];
      if (input.productPhoto) content.push(await image(input.productPhoto));
      content.push(text(capturePrompt(input)));
      return mapCapture(await ask(CaptureSchema, content));
    },

    async readBusinessCard(photo: Blob) {
      return mapCard(await ask(CardSchema, [await image(photo, 'high'), text(cardPrompt)], 1500));
    },

    async analyzeProduct(p, productPhoto, infoPhoto) {
      const content: Part[] = [];
      if (productPhoto) content.push(await image(productPhoto));
      if (infoPhoto) content.push(await image(infoPhoto, 'high'));
      content.push(text(analysisPrompt(p)));
      return mapAnalysis(await ask(AnalysisSchema, content));
    },

    async scoreProduct(p) {
      return mapScore(await ask(ScoreSchema, [text(scorePrompt(p))]));
    },

    translate: (strings) => translateInChunks(strings, async (chunk) =>
      (await ask(TranslateSchema, [text(translatePrompt(chunk))], 6000)).translations),
  };
}
