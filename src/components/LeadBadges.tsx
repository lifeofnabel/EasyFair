import { PROJECTS, labelOf } from '../constants/options';
import { RED_FLAGS, isSalesChance } from '../constants/stand';
import { RED_FLAG_CHECK } from '../constants/guide';
import type { Priority, Product, ProjectId } from '../types/models';
import { toast } from './ui';

export function PriorityBadge({ priority, big }: { priority: Priority | null | undefined; big?: boolean }) {
  if (!priority) return null;
  return <span className={`prio prio--${priority}${big ? ' prio--big' : ''}`} aria-label={`Priority ${priority}`}>{priority}</span>;
}

export function TagChips({ projects, limit = 4 }: { projects: ProjectId[]; limit?: number }) {
  if (!projects.length) return null;
  return (
    <span className="tag-row">
      {projects.slice(0, limit).map((id) => <span key={id} className={`tag-pill tag-pill--${id}`}>{labelOf(PROJECTS, id).split(' ')[0]}</span>)}
    </span>
  );
}

export function SalesChance({ p, big }: { p: Pick<Product, 'stand'>; big?: boolean }) {
  if (!isSalesChance(p)) return null;
  return <span className={`sales-chance${big ? ' sales-chance--big' : ''}`}>🚀 SALES CHANCE</span>;
}

/** Warning for red flags, with the verification tip from the game plan. */
export function RedFlagBanner({ p }: { p: Pick<Product, 'redFlags' | 'supplier'> }) {
  if (!p.redFlags.length) return null;
  const company = p.supplier.company.trim();
  return (
    <div className="redflag-banner" role="alert">
      <strong>🚩 Red flag{p.redFlags.length > 1 ? 's' : ''}</strong>
      <ul>{p.redFlags.map((f) => <li key={f}>{labelOf(RED_FLAGS, f)}</li>)}</ul>
      <p className="small">{RED_FLAG_CHECK}</p>
      {company && (
        <button type="button" className="btn btn--small" onClick={async () => {
          try { await navigator.clipboard.writeText(company); toast('Company name copied.'); } catch { toast('Copy not available.', { error: true }); }
        }}>Copy company name</button>
      )}
    </div>
  );
}
