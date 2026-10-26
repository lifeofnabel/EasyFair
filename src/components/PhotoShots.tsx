import type { ChangeEvent } from 'react';
import { INFO_TYPES } from '../constants/options';
import type { InfoType, Photo, PhotoKind } from '../types/models';
import { PhotoImg } from './ProductCard';

export function ShotButton({ kind, label, icon, main, small, onFile }: {
  kind: PhotoKind; label: string; icon: string; main?: boolean; small?: boolean; onFile: (f: File, kind: PhotoKind) => void;
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    files.forEach((f) => onFile(f, kind));
    e.target.value = '';
  };
  return (
    <label className={`shot${main ? ' shot--main' : ''}${small ? ' shot--small' : ''}`}>
      <span className="shot__icon" aria-hidden>{icon}</span>
      <span>{label}</span>
      <input type="file" accept="image/*" capture="environment" onChange={onChange} aria-label={label} />
    </label>
  );
}

/** Compact camera buttons for use inside a conversation (stand talk). */
export function QuickShots({ onFile, busy }: { onFile: (f: File, kind: PhotoKind) => void; busy: boolean }) {
  const one = (kind: PhotoKind, label: string, icon: string) => (
    <label className="quick-shot">
      <span aria-hidden>{icon}</span>{label}
      <input type="file" accept="image/*" capture="environment" aria-label={label}
        onChange={(e) => { [...(e.target.files ?? [])].forEach((f) => onFile(f, kind)); e.target.value = ''; }} />
    </label>
  );
  return (
    <div className="quick-shots" aria-busy={busy}>
      {one('product', 'Product', '📦')}
      {one('info', 'Card / QR', '🪪')}
      {one('booth', 'Booth', '🏬')}
    </div>
  );
}

export function PhotoStrip({ photos, onRemove, onSetPhoto }: {
  photos: Photo[];
  onRemove: (id: string) => void;
  onSetPhoto: (id: string, changes: Partial<Photo>) => void;
}) {
  if (!photos.length) return null;
  return (
    <div className="stack">
      <div className="photo-strip">
        {photos.map((ph) => (
          <div key={ph.id} className="photo-tile">
            <PhotoImg photo={ph} />
            <button type="button" className="photo-tile__x" aria-label="Remove photo" onClick={() => onRemove(ph.id)}>✕</button>
            <div className="photo-tile__label">{ph.kind === 'info' ? INFO_TYPES.find((t) => t.id === ph.infoType)?.label : ph.kind}</div>
          </div>
        ))}
      </div>
      {photos.filter((p) => p.kind === 'info').map((ph) => (
        <div key={ph.id} className="row row--wrap">
          <div className="thumb"><PhotoImg photo={ph} /></div>
          <div className="chips grow">
            {INFO_TYPES.map((t) => (
              <button key={t.id} type="button" className="chip chip--sm" aria-pressed={ph.infoType === t.id}
                onClick={() => onSetPhoto(ph.id, { infoType: t.id as InfoType })}>{t.label}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
