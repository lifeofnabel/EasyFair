import { Link } from 'react-router-dom';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import { categoryIcon, categoryLabel, marketsLabel, productTitle, projectsLabel } from '../services/format';
import type { Fair, Photo, Product } from '../types/models';
import { Stars } from './ui';

export function PhotoImg({ photo, fallback, quality = 'low', alt = '' }: { photo?: Photo; fallback?: string; quality?: 'low' | 'high'; alt?: string }) {
  const url = usePhotoUrl(photo, quality);
  return url ? <img src={url} alt={alt} loading="lazy" decoding="async" /> : <span aria-hidden>{fallback ?? '📷'}</span>;
}

export const mainPhoto = (p: Product) => p.photos.find((ph) => ph.kind === 'product') ?? p.photos[0];

export function ProductCard({ product: p, fairs, to }: { product: Product; fairs?: Fair[]; to?: string }) {
  const fair = fairs?.find((f) => f.id === p.fairId);
  return (
    <Link to={to ?? `/product/${p.id}`} className={`pcard${p.archivedAt ? ' pcard--archived' : ''}`}>
      <div className="pcard__img"><PhotoImg photo={mainPhoto(p)} fallback={categoryIcon(p)} /></div>
      <div className="pcard__body">
        <div className="pcard__name">{productTitle(p)}</div>
        <div className="pcard__meta truncate">{categoryLabel(p)}</div>
        {p.targetMarkets.length > 0 && <div className="pcard__meta truncate">{marketsLabel(p)}</div>}
        <div className="row row--between">
          <Stars value={p.interest} size="sm" />
          {p.ai.score && <span className="tag">{p.ai.score.total}/100</span>}
        </div>
        {(p.projects.length > 0 || p.supplier.company) && (
          <div className="pcard__meta truncate">{[projectsLabel(p), p.supplier.company].filter(Boolean).join(' · ')}</div>
        )}
        {fair && <div className="pcard__meta truncate">{fair.name}{p.archivedAt ? ' · Archived' : ''}</div>}
      </div>
    </Link>
  );
}
