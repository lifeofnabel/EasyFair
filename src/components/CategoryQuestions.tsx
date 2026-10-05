import { CATEGORIES, visibleQuestions, type Question } from '../constants/categories';
import type { Option } from '../constants/options';
import type { AnswerValue, CategoryId } from '../types/models';
import { ChipMulti, ChipSelect, Field, YesNo } from './ui';

export function CategoryPicker({ value, onChange, suggested }: { value: CategoryId | null; onChange: (v: CategoryId | null) => void; suggested?: CategoryId }) {
  const options: Option<CategoryId>[] = CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon }));
  return <ChipSelect options={options} value={value} onChange={onChange} suggested={suggested ? [suggested] : undefined} />;
}

function QuestionInput({ q, value, onChange }: { q: Question; value: AnswerValue | undefined; onChange: (v: AnswerValue | undefined) => void }) {
  switch (q.kind) {
    case 'single':
      return <ChipSelect small options={q.options ?? []} value={(value as string) ?? null} onChange={(v) => onChange(v ?? undefined)} />;
    case 'multi':
      return <ChipMulti small options={q.options ?? []} value={(value as string[]) ?? []} onChange={(v) => onChange(v.length ? v : undefined)} />;
    case 'bool':
      return <YesNo value={value as boolean | undefined} onChange={onChange} />;
    case 'number':
      return <input className="input" type="number" inputMode="decimal" value={(value as number | undefined) ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
    default:
      return <input className="input" value={(value as string | undefined) ?? ''} placeholder={q.unit}
        onChange={(e) => onChange(e.target.value || undefined)} />;
  }
}

/** Dynamic sub-questions: only those that fit the current answers are shown. */
export function CategoryQuestions({ categoryId, answers, onChange, mode = 'all' }: {
  categoryId: CategoryId | null;
  answers: Record<string, AnswerValue>;
  onChange: (answers: Record<string, AnswerValue>) => void;
  mode?: 'quick' | 'more' | 'all';
}) {
  const qs = visibleQuestions(categoryId, answers).filter((q) => (mode === 'all' ? true : mode === 'quick' ? q.quick : !q.quick));
  if (!qs.length) return null;
  const set = (id: string, v: AnswerValue | undefined) => {
    const next = { ...answers };
    if (v === undefined) delete next[id]; else next[id] = v;
    onChange(next);
  };
  return (
    <div className="stack">
      {qs.map((q) => (
        <Field key={q.id} label={q.label}>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
        </Field>
      ))}
    </div>
  );
}
