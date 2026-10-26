import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { useProducts } from '../hooks/useData';
import { isOpenFollowUp } from '../services/followup';

interface Tile { to: string; icon: IconName | null; zh?: string; title: string; sub: string; badge?: number }

export default function More() {
  const products = useProducts();
  const open = (products ?? []).filter(isOpenFollowUp).length;
  const tiles: Tile[] = [
    { to: '/stand', icon: 'store', title: 'Stand talk', sub: '8 questions, 10 minutes' },
    { to: '/plan', icon: 'list', title: 'Plan & halls', sub: 'Timeline, halls, exhibitors' },
    { to: '/pitch', icon: 'sparkle', title: 'Pitch', sub: 'Opener + teleprompter' },
    { to: '/deal', icon: 'review', title: 'Deal helper', sub: 'Order, phrases, red flags' },
    { to: '/followup', icon: 'edit', title: 'Follow-up', sub: 'WeChat messages tonight', badge: open },
    { to: '/phrases', icon: null, zh: '中', title: 'Phrases', sub: 'Chinese to show' },
    { to: '/review', icon: 'review', title: 'Review', sub: 'At home: go through all' },
    { to: '/projects', icon: 'folder', title: 'Projects', sub: 'By tag' },
    { to: '/settings', icon: 'settings', title: 'Settings', sub: 'AI, photos, backup' },
  ];
  return (
    <div className="page">
      <div className="topbar"><h1>Toolkit</h1></div>
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
