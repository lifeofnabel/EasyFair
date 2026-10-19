import { db } from '../../db/db';
import { updateProduct } from '../../db/repo';
import type { ContactSuggestion, Photo, Product, StructuredSuggestion } from '../../types/models';
import { SCORE_DIMENSIONS } from '../../types/models';
import { nowIso } from '../ids';
import { claudeReady, deepseekReady, loadSettings } from '../settings';
import { mockProvider } from './mock';
import { parseVoiceNote } from './rules';
import { AiError, type AiProvider } from './types';

export { AiError };

const loadClaude = () => import('./anthropic').then((m) => m.createAnthropicProvider);
const loadDeepseek = () => import('./deepseek').then((m) => m.createDeepseekProvider);

/** The real provider if a key is set, else the offline Demo AI. */
async function provider(): Promise<AiProvider> {
  const s = await loadSettings();
  if (deepseekReady(s)) return (await loadDeepseek())(s.deepseekApiKey.trim(), s.deepseekModel);
  if (claudeReady(s)) return (await loadClaude())(s.anthropicApiKey.trim(), s.anthropicModel);
  return mockProvider;
}

export async function providerLabel(): Promise<string> {
  return (await provider()).label;
}

async function lowBlob(photo: Photo | undefined): Promise<Blob | undefined> {
  if (!photo) return undefined;
  return (await db.photoBlobs.get(photo.id))?.low;
}

/** Image choice: product photo for product understanding; datasheet/price list/packaging for facts. Booth and "other" never. */
export function pickAiPhotos(photos: Photo[]): { product?: Photo; info?: Photo } {
  return {
    product: photos.find((p) => p.kind === 'product'),
    info: photos.find((p) => p.kind === 'info' && ['datasheet', 'price_list', 'packaging'].includes(p.infoType ?? '')),
  };
}

export interface StructureResult {
  suggestion: StructuredSuggestion;
  source: 'ai' | 'rules';
}

/**
 * Voice note (+ product photo) -> title, description and suggested fields. Offline, on error, or
 * without a key, the instant rule parser answers, so the fair flow never waits on the network.
 */
export async function structureCapture(transcript: string, productPhoto?: Blob): Promise<StructureResult> {
  if (!transcript.trim() && !productPhoto) return { suggestion: {}, source: 'rules' };
  const p = await provider();
  if (p.id !== 'mock' && navigator.onLine) {
    try {
      return { suggestion: await p.structureCapture({ transcript, productPhoto }), source: 'ai' };
    } catch {
      // fall through to rules: the fair flow must never block
    }
  }
  return { suggestion: parseVoiceNote(transcript), source: 'rules' };
}

export async function readBusinessCard(photo: Photo): Promise<{ contact: ContactSuggestion; simulated: boolean }> {
  const blob = await lowBlob(photo);
  if (!blob) throw new AiError('The photo is not available on this device.');
  const p = await provider();
  if (p.id !== 'mock' && !navigator.onLine) throw new AiError('Offline. The card will be read when you are online.');
  return { contact: await p.readBusinessCard(blob), simulated: p.id === 'mock' };
}

/** Results are stored; an existing analysis is reused unless the user explicitly asks again. */
export async function analyzeProduct(product: Product, force = false): Promise<Product> {
  if (product.ai.analysis && !force) return product;
  const p = await provider();
  if (p.id !== 'mock' && !navigator.onLine) throw new AiError('Offline. Start the analysis again when you are online.');
  const { product: prodPhoto, info } = pickAiPhotos(product.photos);
  const result = await p.analyzeProduct(product, await lowBlob(prodPhoto), await lowBlob(info));
  const at = nowIso();
  const used = new Set([prodPhoto?.id, info?.id].filter(Boolean));
  return updateProduct(product.id, (cur) => ({
    ai: { ...cur.ai, analysis: { ...result, provider: p.label, at } },
    photos: p.id === 'mock' ? cur.photos : cur.photos.map((ph) => (used.has(ph.id) ? { ...ph, aiUsedAt: at } : ph)),
  }), 'ai_analysis');
}

export function scoreTotal(dims: Record<string, number>): number {
  const sum = SCORE_DIMENSIONS.reduce((n, d) => n + (dims[d] ?? 0), 0);
  return Math.round((sum / (SCORE_DIMENSIONS.length * 10)) * 100);
}

export async function scoreProduct(product: Product, force = false): Promise<Product> {
  if (product.ai.score && !force) return product;
  const p = await provider();
  if (p.id !== 'mock' && !navigator.onLine) throw new AiError('Offline. Start the score again when you are online.');
  const result = await p.scoreProduct(product);
  return updateProduct(product.id, (cur) => ({
    ai: { ...cur.ai, score: { ...result, total: scoreTotal(result.dims), provider: p.label, at: nowIso() } },
  }), 'ai_score');
}

/** Arabic translation of arbitrary strings (page translator). Needs a real provider and a connection. */
export async function translateToArabic(strings: string[]): Promise<string[]> {
  const p = await provider();
  if (p.id === 'mock') return p.translate(strings);
  if (!navigator.onLine) throw new AiError('Offline. Translation needs a connection. Pages you translated before still work.');
  return p.translate(strings);
}
