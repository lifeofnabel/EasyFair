import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { useProducts } from '../hooks/useData';
import { isOpenFollowUp } from '../services/followup';

interface Tile { to: string; icon: IconName | null; zh?: string; title: string; sub: string; badge?: number }

export default function More() {
  const products = useProducts();
  const open = (products ?? []).filter(isOpenFollowUp).length;
  const tiles: Tile[] = [
    { to: '/plan', icon: 'list', title: 'Plan & halls', sub: 'Timeline, halls, exhibitors' },
    { to: '/phrases', icon: null, zh: '中', title: 'Phrases', sub: 'Chinese to show' },
    { to: '/pitch', icon: 'sparkle', title: 'Pitch', sub: 'Opener + teleprompter' },
    { to: '/deal', icon: 'review', title: 'Deal helper', sub: 'Order, phrases, red flags' },
    { to: '/stand', icon: 'store', title: 'Stand talk', sub: 'Optional 8-question checklist' },
    { to: '/followup', icon: 'edit', title: 'Follow-up', sub: 'WeChat messages tonight', badge: open },
  ];
  return (
    <div className="page">
      <div className="topbar"><h1>Fair guide</h1></div>
      <p className="small muted">Optional help for the fair: plan, phrases, pitch, deal tips. Your normal flow stays Add product → Products → Review.</p>
      <div className="tile-grid">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="tile">
            <span className="tile__icon" aria-hidden>{t.icon ? <Icon name={t.icon} /> : <span lang="zh-CN" data-no-translate>{t.zh}</span>}</span>
            <strong>{t.title}</strong>
            <span className="small muted">{t.sub}</span>
            {t.badge ? <span className="tile__badge">{t.badge}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
