import { CATEGORY_MAP } from '../constants/categories';
import type { BusinessType, CategoryId, InvestorId, MarketId, Product, ProjectId, SeasonId } from '../types/models';

export interface ProductFilter {
  q: string;
  categoryId: CategoryId | null;
  type: string | null;
  market: MarketId | null;
  businessType: BusinessType | null;
  season: SeasonId | null;
  project: ProjectId | null;
  investor: InvestorId | null;
  minInterest: number;
  fairId: string | null;
  archived: 'hide' | 'show' | 'only';
  reviewOnly: boolean;
}

export const EMPTY_FILTER: ProductFilter = {
  q: '', categoryId: null, type: null, market: null, businessType: null, season: null, project: null, investor: null,
  minInterest: 0, fairId: null, archived: 'hide', reviewOnly: false,
};

function haystack(p: Product): string {
  const s = p.supplier;
  return [p.name, p.description, p.notes, p.voiceTranscript, s.company, s.contactPerson, s.email, s.phone, s.wechat, s.boothNumber,
    p.categoryId ? CATEGORY_MAP[p.categoryId].label : ''].join(' ').toLowerCase();
}

export function matchesFilter(p: Product, f: ProductFilter): boolean {
  if (f.archived === 'hide' && p.archivedAt) return false;
  if (f.archived === 'only' && !p.archivedAt) return false;
  if (f.categoryId && p.categoryId !== f.categoryId) return false;
  if (f.type && f.categoryId) {
    const typeQ = CATEGORY_MAP[f.categoryId].typeQuestionId;
    if (p.categoryAnswers[typeQ] !== f.type) return false;
  }
  if (f.market && !p.targetMarkets.includes(f.market)) return false;
  if (f.businessType && p.businessType !== f.businessType) return false;
  if (f.season && !p.seasons.includes(f.season)) return false;
  if (f.project && !p.projects.includes(f.project)) return false;
  if (f.investor && !p.investors.some((i) => i.investorId === f.investor)) return false;
  if (f.minInterest && p.interest < f.minInterest) return false;
  if (f.fairId && p.fairId !== f.fairId) return false;
  if (f.reviewOnly && !p.needsReview) return false;
  if (f.q.trim()) {
    const text = haystack(p);
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w))) return false;
  }
  return true;
}

export function filterProducts(list: Product[], f: ProductFilter): Product[] {
  return list.filter((p) => matchesFilter(p, f));
}

export function activeFilterCount(f: ProductFilter): number {
  return (Object.keys(EMPTY_FILTER) as (keyof ProductFilter)[])
    .filter((k) => k !== 'q' && f[k] !== EMPTY_FILTER[k]).length;
}

/** Filter <-> URL query, so PDF export and links keep the selection. */
export function filterToParams(f: ProductFilter): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v !== EMPTY_FILTER[k as keyof ProductFilter] && v !== null && v !== '') params.set(k, String(v));
  }
  return params;
}

export function paramsToFilter(params: URLSearchParams): ProductFilter {
  const f: ProductFilter = { ...EMPTY_FILTER };
  const str = (k: keyof ProductFilter) => params.get(k) || null;
  f.q = params.get('q') ?? '';
  f.categoryId = str('categoryId') as CategoryId | null;
  f.type = str('type');
  f.market = str('market') as MarketId | null;
  f.businessType = str('businessType') as BusinessType | null;
  f.season = str('season') as SeasonId | null;
  f.project = str('project') as ProjectId | null;
  f.investor = str('investor') as InvestorId | null;
  f.minInterest = Number(params.get('minInterest') ?? 0) || 0;
  f.fairId = str('fairId');
  f.archived = (params.get('archived') as ProductFilter['archived']) ?? 'hide';
  f.reviewOnly = params.get('reviewOnly') === 'true';
  return f;
}
