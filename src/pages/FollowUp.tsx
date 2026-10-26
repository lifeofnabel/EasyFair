import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FollowUpCard } from '../components/FollowUpCard';
import { TranslateButton } from '../components/Translate';
import { ChipSelect } from '../components/ui';
import { useProducts } from '../hooks/useData';
import { dayStats, isLead, isOpenFollowUp } from '../services/followup';
import type { Product } from '../types/models';

type Mode = 'open' | 'unsent' | 'sent';

const rank = (p: Product) => (p.priority === 'A' ? 0 : p.priority === 'B' ? 1 : p.priority === 'C' ? 2 : 3);

export default function FollowUp() {
  const products = useProducts();
  const [mode, setMode] = useState<Mode>('open');
  const all = useMemo(() => (products ?? []).filter(isLead), [products]);
  const stats = useMemo(() => dayStats(all), [all]);
  const list = useMemo(() => {
    const base = mode === 'open' ? all.filter(isOpenFollowUp) : mode === 'sent' ? all.filter((p) => p.followUpSentAt) : all.filter((p) => !p.followUpSentAt);
    return [...base].sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  }, [all, mode]);

  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Follow-up</h1><TranslateButton /></div>
      <div className="card summary-card">
        <div className="summary-card__line"><strong>Today</strong>: {stats.leads} lead{stats.leads === 1 ? '' : 's'} · {stats.aLeads} A-lead{stats.aLeads === 1 ? '' : 's'} · <strong>{stats.open}</strong> open</div>
        {stats.unrated > 0 && <Link to="/products?priority=" className="small muted">{stats.unrated} lead{stats.unrated === 1 ? '' : 's'} from today have no priority yet.</Link>}
      </div>
      <p className="small muted">Noch am selben Abend per WeChat. Offen = Priorität A oder B ohne gesendete Nachricht.</p>
      <ChipSelect allowEmpty={false} value={mode} onChange={(m) => setMode((m ?? 'open') as Mode)}
        options={[{ id: 'open', label: `Open ${stats.open}` }, { id: 'unsent', label: 'All unsent' }, { id: 'sent', label: 'Sent' }]} />
      {products && list.length === 0 && (
        <div className="empty">{mode === 'open' ? '🎉 No open follow-ups.' : 'Nothing here.'}<Link className="btn" to="/products">Leads</Link></div>
      )}
      <div className="stack">{list.map((p) => <FollowUpCard key={p.id} p={p} />)}</div>
    </div>
  );
}
