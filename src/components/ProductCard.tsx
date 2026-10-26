import { Link } from 'react-router-dom';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
import { categoryIcon, categoryLabel, marketsLabel, productTitle } from '../services/format';
import type { Fair, Photo, Product } from '../types/models';
import { PriorityBadge, SalesChance, TagChips } from './LeadBadges';
import { Stars } from './ui';

export function PhotoImg({ photo, fallback, quality = 'low', alt = '', eager = false }: { photo?: Photo; fallback?: string; quality?: 'low' | 'high'; alt?: string; eager?: boolean }) {
  const url = usePhotoUrl(photo, quality);
  return url ? <img src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" /> : <span aria-hidden>{fallback ?? '📷'}</span>;
}

export const mainPhoto = (p: Product) => p.photos.find((ph) => ph.kind === 'product') ?? p.photos[0];

export function ProductCard({ product: p, fairs, to }: { product: Product; fairs?: Fair[]; to?: string }) {
  const fair = fairs?.find((f) => f.id === p.fairId);
  const where = [p.hall && `Hall ${p.hall}`, p.supplier.boothNumber && `#${p.supplier.boothNumber}`].filter(Boolean).join(' · ');
  const title = productTitle(p);
  const company = p.supplier.company.trim();
  return (
    <Link to={to ?? `/product/${p.id}`} className={`pcard${p.archivedAt ? ' pcard--archived' : ''}`}>
      <div className="pcard__img">
        <PhotoImg photo={mainPhoto(p)} fallback={categoryIcon(p)} />
        {p.priority && <span className="pcard__prio"><PriorityBadge priority={p.priority} /></span>}
        {(p.redFlags.length > 0 || p.followUpSentAt) && (
          <span className="pcard__marks">{p.redFlags.length > 0 && <span title="Red flags">🚩</span>}{p.followUpSentAt && <span title="Follow-up sent">✓</span>}</span>
        )}
      </div>
      <div className="pcard__body">
        <div className="pcard__name">{company && title !== company ? company : title}</div>
        {company && title !== company && <div className="pcard__meta truncate">{title}</div>}
        {where && <div className="pcard__meta truncate">{where}</div>}
        <div className="row row--between">
          <Stars value={p.interest} size="sm" />
          {p.ai.score ? <span className="tag">{p.ai.score.total}/100</span> : null}
        </div>
        <div className="pcard__chips"><TagChips projects={p.projects} limit={3} /><SalesChance p={p} /></div>
        {!where && <div className="pcard__meta truncate">{categoryLabel(p)}{p.targetMarkets.length > 0 ? ` · ${marketsLabel(p)}` : ''}</div>}
        {fair && <div className="pcard__meta truncate">{fair.name}{p.archivedAt ? ' · Archived' : ''}</div>}
      </div>
    </Link>
  );
}
