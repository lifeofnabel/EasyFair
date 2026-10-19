import { kvGet, kvSet } from '../db/db';
import type { AppSettings } from '../types/models';
import { nowIso } from './ids';

export const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'mock',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-flash',
  anthropicApiKey: '',
  anthropicModel: 'claude-opus-5-5',
  cloudinaryCloudName: 'dwzzcufpf',
  cloudinaryApiKey: '',
  cloudinaryUploadPreset: 'messe_unsigned',
  cloudinaryFolder: 'messe',
  autoStructureVoice: true,
};

export async function loadSettings(): Promise<AppSettings> {
  return { ...DEFAULT_SETTINGS, ...(await kvGet<Partial<AppSettings>>('settings', {})) };
}

export async function saveSettings(s: AppSettings): Promise<void> {
  await kvSet('settings', s);
  await kvSet('settingsUpdatedAt', nowIso());
  await kvSet('settingsDirty', true);
}

export const cloudinaryReady = (s: AppSettings) => Boolean(s.cloudinaryCloudName && s.cloudinaryUploadPreset);
export const deepseekReady = (s: AppSettings) => s.aiProvider === 'deepseek' && s.deepseekApiKey.trim().length > 10;
export const claudeReady = (s: AppSettings) => s.aiProvider === 'anthropic' && s.anthropicApiKey.trim().length > 20;
export const aiReady = (s: AppSettings) => deepseekReady(s) || claudeReady(s);
