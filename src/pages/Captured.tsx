import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PhotoImg, mainPhoto } from '../components/ProductCard';
import { Stars } from '../components/ui';
import { db } from '../db/db';
import { updateProduct } from '../db/repo';
import { useProduct } from '../hooks/useData';
import { categoryIcon, categoryLabel, marketsLabel, productTitle, projectsLabel } from '../services/format';

/** Count of active products from the same company (supplier insight). */
export function useSupplierCount(company: string | undefined): number {
  return useLiveQuery(async () => {
    const c = company?.trim().toLowerCase();
    if (!c) return 0;
    return db.products.filter((p) => !p.archivedAt && p.supplier.company.trim().toLowerCase() === c).count();
  }, [company]) ?? 0;
}

export function SupplierInsight({ company }: { company: string }) {
  const n = useSupplierCount(company);
  if (n < 3) return null;
  return (
    <Link to={`/products?q=${encodeURIComponent(company)}`} className="hint-box" style={{ textDecoration: 'none', display: 'block' }}>
      💡 You have <strong>{n} products</strong> from {company}. Supplier focus? Tap to see all.
    </Link>
  );
}

export default function Captured() {
  const { id } = useParams();
  const navigate = useNavigate();
  const p = useProduct(id);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);

  if (p === undefined) return null;
  if (p === null) return <div className="page"><p>Product not found.</p></div>;

  const nextProduct = () => navigate('/capture', { replace: true });
  const sameBooth = () => navigate(`/capture?booth=${p.id}`, { replace: true });
  const edit = () => navigate(`/product/${p.id}`, { replace: true });

  const onPointerUp = () => {
    if (dx > 90) nextProduct();
    else if (dx < -90) edit();
    setDx(0);
    start.current = null;
  };

  return (
    <div className="page page--narrow">
      <div className="topbar">
        <h1>Saved ✓</h1>
        <Link to="/" className="btn btn--quiet btn--small">Done</Link>
      </div>

      <div className="card card--flush qcard" style={{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)` }}
        onPointerDown={(e) => { start.current = e.clientX; }}
        onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
        onPointerUp={onPointerUp} onPointerCancel={() => { setDx(0); start.current = null; }}>
        <div className="qcard__img"><PhotoImg photo={mainPhoto(p)} fallback={categoryIcon(p)} /></div>
        <div className="stack" style={{ padding: 14 }}>
          <div>
            <h2 style={{ fontSize: '1.15rem' }}>{productTitle(p)}</h2>
            <p className="small muted">{[categoryLabel(p), marketsLabel(p), p.businessType, projectsLabel(p)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="row row--between">
            <Stars value={p.interest} onChange={(interest) => void updateProduct(p.id, { interest })} />
            <button type="button" className="chip chip--sm" aria-pressed={p.needsReview}
              onClick={() => void updateProduct(p.id, { needsReview: !p.needsReview })}>
              {p.needsReview ? '✓ Review later' : 'Review later?'}
            </button>
          </div>
          {p.supplier.company && <SupplierInsight company={p.supplier.company} />}
        </div>
      </div>
      <div className="swipe-hint"><span>← swipe to edit</span><span>swipe for next →</span></div>

      <button type="button" className="btn btn--big btn--pink btn--block" onClick={nextProduct}><Icon name="plus" />Next product</button>
      <div className="grid-2">
        <button type="button" className="btn btn--big" onClick={sameBooth}><Icon name="store" />Same booth</button>
        <button type="button" className="btn btn--big" onClick={edit}><Icon name="edit" />Edit</button>
      </div>
    </div>
  );
}
