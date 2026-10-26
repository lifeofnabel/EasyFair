import { useMemo } from 'react';
import { CATEGORIES, CATEGORY_MAP } from '../constants/categories';
import { BUSINESS_TYPES, INVESTORS, MARKETS, PROJECTS, SEASONS } from '../constants/options';
import { PRIORITIES } from '../constants/stand';
import { localDate } from '../services/followup';
import type { ProductFilter } from '../services/filter';
import { EMPTY_FILTER, hallKey } from '../services/filter';
import type { Fair, Product } from '../types/models';
import { ChipSelect, Field } from './ui';

const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** Halls and days are taken from your own leads, so only choices that exist are offered. */
export function FilterPanel({ value, onChange, fairs, products }: {
  value: ProductFilter;
  onChange: (f: ProductFilter) => void;
  fairs?: Fair[];
  products?: Product[];
}) {
  const set = (patch: Partial<ProductFilter>) => onChange({ ...value, ...patch });
  const cat = value.categoryId ? CATEGORY_MAP[value.categoryId] : null;
  const typeOptions = cat?.questions.find((q) => q.id === cat.typeQuestionId)?.options ?? [];
  const halls = useMemo(
    () => [...new Set((products ?? []).filter((p) => p.hall.trim()).map((p) => hallKey(p.hall)))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    [products],
  );
  const days = useMemo(() => [...new Set((products ?? []).map((p) => localDate(p.createdAt)))].sort().reverse().slice(0, 7), [products]);
  const toggle = (label: string, key: 'salesChance' | 'redFlags') => (
    <button type="button" className="chip" aria-pressed={value[key]} onClick={() => set({ [key]: !value[key] })}>{label}</button>
  );

  return (
    <div className="stack">
      <Field label="Priority">
        <ChipSelect small options={[...PRIORITIES, { id: 'none', label: 'Not rated' }]} value={value.priority}
          onChange={(priority) => set({ priority: priority as ProductFilter['priority'] })} />
      </Field>
      <Field label="Tag"><ChipSelect small options={PROJECTS} value={value.project} onChange={(project) => set({ project })} /></Field>
      {days.length > 0 && (
        <Field label="Day"><ChipSelect small options={days.map((d) => ({ id: d, label: dayLabel(d) }))} value={value.day} onChange={(day) => set({ day })} /></Field>
      )}
      {halls.length > 0 && (
        <Field label="Hall"><ChipSelect small options={halls.map((h) => ({ id: h, label: `Hall ${h}` }))} value={value.hall ? hallKey(value.hall) : null} onChange={(hall) => set({ hall })} /></Field>
      )}
      <Field label="Status">
        <div className="chips">
          <button type="button" className="chip" aria-pressed={value.followUp === 'open'} onClick={() => set({ followUp: value.followUp === 'open' ? null : 'open' })}>Follow-up open</button>
          <button type="button" className="chip" aria-pressed={value.followUp === 'sent'} onClick={() => set({ followUp: value.followUp === 'sent' ? null : 'sent' })}>Follow-up sent</button>
          {toggle('🚀 Sales chance', 'salesChance')}
          {toggle('🚩 Red flags', 'redFlags')}
        </div>
      </Field>
      <Field label="Interest">
        <ChipSelect small options={[1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `${'★'.repeat(n)}+` }))}
          value={value.minInterest ? String(value.minInterest) : null} onChange={(v) => set({ minInterest: v ? Number(v) : 0 })} />
      </Field>
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
      <Field label="B2B / B2C"><ChipSelect small options={BUSINESS_TYPES} value={value.businessType} onChange={(businessType) => set({ businessType })} /></Field>
      <Field label="Season"><ChipSelect small options={SEASONS} value={value.season} onChange={(season) => set({ season })} /></Field>
      <Field label="Investor"><ChipSelect small options={INVESTORS} value={value.investor} onChange={(investor) => set({ investor })} /></Field>
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
