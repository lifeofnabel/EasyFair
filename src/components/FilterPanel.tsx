import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';
import { BUSINESS_TYPES, INVESTORS, MARKETS, PROJECTS, SEASONS } from '../constants/options';
import type { ProductFilter } from '../services/filter';
import { EMPTY_FILTER } from '../services/filter';
import type { Fair } from '../types/models';
import { ChipSelect, Field } from './ui';

export function FilterPanel({ value, onChange, fairs, compact }: {
  value: ProductFilter;
  onChange: (f: ProductFilter) => void;
  fairs?: Fair[];
  compact?: boolean;
}) {
  const set = (patch: Partial<ProductFilter>) => onChange({ ...value, ...patch });
  const cat = value.categoryId ? CATEGORY_MAP[value.categoryId] : null;
  const typeOptions = cat?.questions.find((q) => q.id === cat.typeQuestionId)?.options ?? [];
  return (
    <div className="stack">
      <Field label="Category">
        <ChipSelect small options={CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon }))} value={value.categoryId}
          onChange={(categoryId) => set({ categoryId, type: null })} />
      </Field>
      {cat && (
        <Field label="Type">
          <ChipSelect small options={typeOptions} value={value.type} onChange={(type) => set({ type })} />
        </Field>
      )}
      <Field label="Target market"><ChipSelect small options={MARKETS} value={value.market} onChange={(market) => set({ market })} /></Field>
      <Field label="Project"><ChipSelect small options={PROJECTS} value={value.project} onChange={(project) => set({ project })} /></Field>
      <Field label="Interest">
        <ChipSelect small options={[1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `${'★'.repeat(n)}+` }))}
          value={value.minInterest ? String(value.minInterest) : null} onChange={(v) => set({ minInterest: v ? Number(v) : 0 })} />
      </Field>
      {!compact && (
        <>
          <Field label="B2B / B2C"><ChipSelect small options={BUSINESS_TYPES} value={value.businessType} onChange={(businessType) => set({ businessType })} /></Field>
          <Field label="Season"><ChipSelect small options={SEASONS} value={value.season} onChange={(season) => set({ season })} /></Field>
          <Field label="Investor"><ChipSelect small options={INVESTORS} value={value.investor} onChange={(investor) => set({ investor })} /></Field>
        </>
      )}
      {fairs && fairs.length > 0 && (
        <Field label="Fair"><ChipSelect small options={fairs.map((f) => ({ id: f.id, label: f.name }))} value={value.fairId} onChange={(fairId) => set({ fairId })} /></Field>
      )}
      <Field label="Archived">
        <ChipSelect small allowEmpty={false} options={[{ id: 'hide', label: 'Hide archived' }, { id: 'show', label: 'Show archived' }, { id: 'only', label: 'Only archived' }]}
          value={value.archived} onChange={(archived) => set({ archived: (archived ?? 'hide') as ProductFilter['archived'] })} />
      </Field>
      <button type="button" className="btn btn--quiet" onClick={() => onChange({ ...EMPTY_FILTER, q: value.q })}>Reset filters</button>
    </div>
  );
}
