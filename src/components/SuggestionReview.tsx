import { CATEGORY_MAP } from '../constants/categories';
import { BUSINESS_TYPES, MARKETS, PROJECTS, PURPOSES, SEASONS, labelOf } from '../constants/options';
import { money } from '../services/format';
import type { Product, StructuredSuggestion } from '../types/models';

export type SuggestionKey = keyof StructuredSuggestion;

export function suggestionLines(s: StructuredSuggestion): { key: SuggestionKey; label: string }[] {
  const lines: { key: SuggestionKey; label: string }[] = [];
  const list = <T extends string>(opts: { id: T; label: string }[], ids?: T[]) => (ids ?? []).map((i) => labelOf(opts, i)).join(', ');
  if (s.categoryId) lines.push({ key: 'categoryId', label: `Category: ${CATEGORY_MAP[s.categoryId].label}` });
  if (s.targetMarkets?.length) lines.push({ key: 'targetMarkets', label: `Target market: ${list(MARKETS, s.targetMarkets)}${s.otherCountries?.length ? ` (${s.otherCountries.join(', ')})` : ''}` });
  if (s.businessType) lines.push({ key: 'businessType', label: labelOf(BUSINESS_TYPES, s.businessType) });
  if (s.projects?.length) lines.push({ key: 'projects', label: `Project: ${list(PROJECTS, s.projects)}` });
  if (s.purposes?.length) lines.push({ key: 'purposes', label: `Goal: ${list(PURPOSES, s.purposes)}` });
  if (s.seasons?.length) lines.push({ key: 'seasons', label: `Season: ${list(SEASONS, s.seasons)}` });
  if (s.price) lines.push({ key: 'price', label: `Approx. price: ${money(s.price.amount, s.price.currency)}` });
  if (s.moq) lines.push({ key: 'moq', label: `MOQ: ${s.moq}` });
  if (s.oem !== undefined) lines.push({ key: 'oem', label: `OEM: ${s.oem ? 'Yes' : 'No'}` });
  if (s.interest) lines.push({ key: 'interest', label: `Interest: ${'★'.repeat(s.interest)}` });
  if (s.supplierCompany) lines.push({ key: 'supplierCompany', label: `Supplier: ${s.supplierCompany}` });
  return lines;
}

/** Applies only the accepted keys. Never overwrites a value the user already set, except when explicitly accepted. */
export function applySuggestion(p: Product, s: StructuredSuggestion, keys: SuggestionKey[]): Product {
  const next = { ...p, pricing: { ...p.pricing }, supplier: { ...p.supplier } };
  for (const k of keys) {
    switch (k) {
      case 'name': next.name = s.name ?? next.name; break;
      case 'categoryId':
        if (s.categoryId && s.categoryId !== next.categoryId) { next.categoryId = s.categoryId; next.categoryAnswers = {}; }
        if (s.categoryAnswers) next.categoryAnswers = { ...next.categoryAnswers, ...s.categoryAnswers };
        break;
      case 'targetMarkets':
        next.targetMarkets = [...new Set([...(s.targetMarkets ?? [])])];
        if (s.otherCountries?.length) next.otherCountries = s.otherCountries;
        break;
      case 'businessType': next.businessType = s.businessType ?? next.businessType; break;
      case 'projects': next.projects = [...new Set([...next.projects, ...(s.projects ?? [])])]; break;
      case 'purposes': next.purposes = [...new Set([...next.purposes, ...(s.purposes ?? [])])]; break;
      case 'seasons': next.seasons = [...new Set([...next.seasons, ...(s.seasons ?? [])])]; break;
      case 'price': if (s.price) { next.pricing.supplierPrice = s.price.amount; next.pricing.currency = s.price.currency; } break;
      case 'moq': next.pricing.moq = s.moq; break;
      case 'oem': next.oem = s.oem ?? null; break;
      case 'interest': next.interest = s.interest ?? next.interest; break;
      case 'supplierCompany': if (s.supplierCompany) next.supplier.company = s.supplierCompany; break;
      default: break;
    }
  }
  return next;
}

export function SuggestionReview({ suggestion, source, rejected, onToggle, onAcceptAll, accepted }: {
  suggestion: StructuredSuggestion;
  source: 'ai' | 'rules';
  rejected: SuggestionKey[];
  accepted: boolean;
  onToggle: (k: SuggestionKey) => void;
  onAcceptAll: () => void;
}) {
  const lines = suggestionLines(suggestion);
  if (!lines.length) {
    return <p className="small muted">No extra fields detected. That's fine: title and description are enough.</p>;
  }
  return (
    <div className="card card--pink stack">
      <div className="row row--between">
        <h3>Pre-filled for you</h3>
        <span className="ai-tag">{source === 'ai' ? 'AI' : 'Auto (offline)'}</span>
      </div>
      <div className="chips">
        {lines.map((l) => {
          const off = rejected.includes(l.key);
          return (
            <button key={l.key} type="button" className="chip chip--sm chip--suggest" aria-pressed={accepted && !off}
              disabled={accepted} onClick={() => onToggle(l.key)} title={off ? 'Tap to include' : 'Tap to remove'}
              style={off ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>
              {l.label}{!off && <span className="chip__x">✕</span>}
            </button>
          );
        })}
      </div>
      {!accepted
        ? (
          <>
            <button type="button" className="btn btn--primary" onClick={onAcceptAll}>Accept {rejected.length ? 'selected' : 'all'}</button>
            <p className="small muted">Tap a chip to drop it. "Next" also accepts the remaining ones.</p>
          </>
        )
        : <p className="small muted">Applied. Adjust anything on the next step.</p>}
    </div>
  );
}
