import type { AiAnalysis, AiScore, ContactSuggestion, Product, StructuredSuggestion } from '../../types/models';

export interface CaptureInput {
  transcript: string;
  /** Low-quality product photo, only if the user took one. */
  productPhoto?: Blob;
}

export type AnalysisResult = Omit<AiAnalysis, 'provider' | 'at'>;
export type ScoreResult = Omit<AiScore, 'provider' | 'at' | 'total'>;

/**
 * Every AI feature goes through this interface. UI never talks to a model directly,
 * so the mock and the real providers are interchangeable.
 */
export interface AiProvider {
  readonly id: 'mock' | 'anthropic' | 'deepseek';
  readonly label: string;
  structureCapture(input: CaptureInput): Promise<StructuredSuggestion>;
  readBusinessCard(photo: Blob): Promise<ContactSuggestion>;
  analyzeProduct(product: Product, productPhoto?: Blob, infoPhoto?: Blob): Promise<AnalysisResult>;
  scoreProduct(product: Product): Promise<ScoreResult>;
  /** Translates strings to Arabic. Same length and order as the input. */
  translate(strings: string[]): Promise<string[]>;
}

export class AiError extends Error {}
