import { CATEGORY_MAP } from '../constants/categories';
import { MARKETS, PROJECTS } from '../constants/options';
import type { Fair, Product } from '../types/models';

export const categoryLabel = (p: Pick<Product, 'categoryId'>) => (p.categoryId ? CATEGORY_MAP[p.categoryId].label : 'Uncategorised');
export const categoryIcon = (p: Pick<Product, 'categoryId'>) => (p.categoryId ? CATEGORY_MAP[p.categoryId].icon : '📷');

export function marketsLabel(p: Pick<Product, 'targetMarkets' | 'otherCountries'>): string {
  return p.targetMarkets.map((m) => {
    if (m === 'OTHER' && p.otherCountries.length) return `🌍 ${p.otherCountries.join(', ')}`;
    const o = MARKETS.find((x) => x.id === m);
    return o ? `${o.icon} ${o.label}` : m;
  }).join(' · ');
}

export const projectsLabel = (p: Pick<Product, 'projects'>) =>
  p.projects.map((id) => PROJECTS.find((o) => o.id === id)?.label ?? id).join(', ');

export const productTitle = (p: Pick<Product, 'name' | 'voiceTranscript' | 'notes'>) =>
  p.name.trim() || p.voiceTranscript.trim().slice(0, 40) || p.notes.trim().slice(0, 40) || 'Untitled product';

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const isToday = (iso: string) => iso.slice(0, 10) === new Date().toISOString().slice(0, 10);

export const fairName = (fairs: Fair[] | undefined, id: string | null) => fairs?.find((f) => f.id === id)?.name ?? '';

export function money(amount: number | undefined, currency: string): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return 'Unknown';
  return `${amount.toLocaleString('en-GB')} ${currency}`;
}
