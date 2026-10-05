import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PhotoImg, mainPhoto } from '../components/ProductCard';
import { Stars } from '../components/ui';
import { useProducts } from '../hooks/useData';
import { categoryIcon, categoryLabel, productTitle, shortDate } from '../services/format';

export default function Review() {
  const products = useProducts();
  const active = useMemo(() => (products ?? []).filter((p) => !p.archivedAt), [products]);
  const queue = useMemo(() => active.filter((p) => p.needsReview).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [active]);
  const done = active.length - queue.length;

  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Review</h1><span className="mono">{done}/{active.length} done</span></div>
      <p className="muted small">At home: go through every product, complete it, run AI analysis and score, then decide.</p>
      {queue.length > 0
        ? <Link className="btn btn--big btn--primary btn--block" to={`/product/${queue[0].id}?review=1`}><Icon name="review" />Start review ({queue.length})</Link>
        : <div className="empty">🎉 Everything reviewed.<Link className="btn" to="/products">All products</Link></div>}
      <div className="card list">
        {queue.map((p) => (
          <Link key={p.id} to={`/product/${p.id}?review=1`} className="list-row">
            <div className="thumb"><PhotoImg photo={mainPhoto(p)} fallback={categoryIcon(p)} /></div>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 600 }}>{productTitle(p)}</div>
              <div className="small muted truncate">{categoryLabel(p)} · {shortDate(p.createdAt)}{p.ai.analysis ? ' · AI ✓' : ''}{p.ai.score ? ` · ${p.ai.score.total}/100` : ''}</div>
            </div>
            <Stars value={p.interest} size="sm" />
          </Link>
        ))}
      </div>
    </div>
  );
}
