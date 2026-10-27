import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PhotoImg, ProductCard, mainPhoto } from '../components/ProductCard';
import { Sheet, Stars } from '../components/ui';
import { FAIR_DAYS, TIMELINE } from '../constants/guide';
import { fairDay, suggestFair } from '../constants/fairs';
import { kvSet } from '../db/db';
import { useFairs, useProducts } from '../hooks/useData';
import { useFairSession } from '../hooks/useFairSession';
import { useKv } from '../hooks/useKv';
import { fairDayNumber, planDay } from '../services/followup';
import { categoryIcon, isToday, productTitle } from '../services/format';
import { useStore } from '../services/store';
import { syncNow, syncState } from '../services/sync';

const DAY_MS = 86_400_000;

/** Small hint to the fair guide: the next open item of today's plan. Secondary help, easy to ignore. */
function NextUp() {
  const [done] = useKv<Record<string, boolean>>('planDone', {});
  const [times] = useKv<Record<string, string>>('planTimes', {});
  const now = new Date();
  const dayNo = planDay(now);
  const today = fairDayNumber(now) === dayNo;
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const items = TIMELINE.filter((t) => t.day === dayNo).map((t) => ({ ...t, time: times[t.id] ?? t.time })).sort((a, b) => a.time.localeCompare(b.time));
  const next = items.find((t) => !done[t.id] && (!today || t.time >= nowHm)) ?? items.find((t) => !done[t.id]);
  return (
    <Link to="/guide" className="card row row--between nextup">
      <span className="stack" style={{ gap: 2 }}>
        <span className="mono">Fair guide · {FAIR_DAYS[dayNo - 1].label}</span>
        <strong>{next ? `${next.time} · ${next.title}` : 'Plan done ✓'}</strong>
      </span>
      <Icon name="next" />
    </Link>
  );
}

export default function Dashboard() {
  const products = useProducts();
  const fairs = useFairs();
  const session = useFairSession();
  const sync = useStore(syncState);
  const navigate = useNavigate();
  const location = useLocation();
  const [pick, setPick] = useState(false);
  const active = useMemo(() => (products ?? []).filter((p) => !p.archivedAt), [products]);
  const today = active.filter((p) => isToday(p.createdAt));
  const picked = fairs?.find((f) => f.id === session?.fairId) ?? null;
  const suggestion = fairs ? suggestFair(fairs) : null;
  const fair = picked ?? suggestion;
  const day = fair ? fairDay(fair) : null;
  const justSaved = (location.state as { savedId?: string } | null)?.savedId;
  const last = active[0] && Date.now() - new Date(active[0].createdAt).getTime() < DAY_MS ? active[0] : null;

  const stats = [
    { label: 'Captured today', value: today.length, to: '/products' },
    { label: 'Interesting', value: today.filter((p) => p.interest >= 4).length, to: '/products?minInterest=4' },
    { label: 'Suppliers', value: new Set(today.map((p) => p.supplier.company.trim().toLowerCase()).filter(Boolean)).size, to: '/products' },
    { label: 'For Germany', value: today.filter((p) => p.targetMarkets.includes('DE')).length, to: '/products?market=DE' },
    { label: 'For Syria', value: today.filter((p) => p.targetMarkets.includes('SY')).length, to: '/products?market=SY' },
  ];
  const high = active.filter((p) => p.interest >= 4).slice(0, 4);
  const review = active.filter((p) => p.needsReview).length;
  const setSession = (fairId: string | null, hall: string) => kvSet('fairSession', { fairId, hall });

  const onCamera = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length) navigate('/capture', { state: { files } });
  };

  const waiting = sync.uploadsEnabled ? sync.pendingPhotos : 0;

  return (
    <div className="page">
      <button type="button" className="card row row--between" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setPick(true)}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="mono">Current fair</span>
          <strong>{fair ? fair.name : 'No fair selected'}{fair && !picked ? ' · auto' : ''}</strong>
          <span className="small muted">
            {fair
              ? [fair.city, day ? `Day ${day}` : `${fair.startDate} – ${fair.endDate}`, session?.hall && `Hall ${session.hall}`].filter(Boolean).join(' · ')
              : 'Tap to set fair and hall once. Every product gets it automatically.'}
          </span>
        </div>
        <Icon name="next" />
      </button>

      <div className="add-row">
        <Link to="/capture" className="btn btn--big btn--pink add-row__main"><Icon name="plus" />ADD PRODUCT</Link>
        <label className="btn btn--big add-row__cam" aria-label="Take a photo and start">
          <Icon name="camera" />
          <input type="file" accept="image/*" capture="environment" onChange={onCamera} />
        </label>
      </div>

      {last && (
        <div className="card last-saved row" aria-live="polite">
          <Link to={`/product/${last.id}`} className="thumb"><PhotoImg photo={mainPhoto(last)} fallback={categoryIcon(last)} /></Link>
          <div className="grow">
            <div className="mono">{justSaved === last.id ? 'Saved ✓' : 'Last saved'}</div>
            <Link to={`/product/${last.id}`} className="truncate last-saved__title">{productTitle(last)}</Link>
            <Stars value={last.interest} size="sm" />
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <Link className="btn btn--small btn--pink" to={`/capture?booth=${last.id}`}><Icon name="store" />Same booth</Link>
            <Link className="btn btn--small" to={`/product/${last.id}`}><Icon name="edit" />Edit</Link>
          </div>
        </div>
      )}

      {waiting > 0 && (
        <div className="hint-box row row--between row--wrap">
          <span>📷 {waiting} photo{waiting > 1 ? 's' : ''} waiting to upload{sync.online ? '' : ' (offline: they are safe on this phone)'}.</span>
          {sync.online && <button type="button" className="btn btn--small" onClick={() => void syncNow()}>Upload now</button>}
        </div>
      )}

      <div className="stat-grid">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="stat">
            <span className="stat__value">{s.value}</span>
            <span className="mono">{s.label}</span>
          </Link>
        ))}
      </div>

      {review > 0 && (
        <Link to="/review" className="card row row--between" style={{ textDecoration: 'none' }}>
          <span><strong>{review}</strong> product{review > 1 ? 's' : ''} to review</span>
          <span className="btn btn--small">Review mode</span>
        </Link>
      )}

      {!products && <div className="skeleton" style={{ height: 200 }} />}
      {active.length > 0 && (
        <section className="stack">
          <div className="section-title"><h2>Recent</h2><Link className="small muted" to="/products">All</Link></div>
          <div className="product-grid">{active.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}</div>
        </section>
      )}
      {high.length > 0 && (
        <section className="stack">
          <div className="section-title"><h2>High interest</h2><Link className="small muted" to="/products?minInterest=4">All</Link></div>
          <div className="product-grid">{high.map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}</div>
        </section>
      )}
      {products && active.length === 0 && (
        <div className="empty">No products yet. Tap ADD PRODUCT at your first booth.<Link className="link-btn" to="/settings">Or load demo data in Settings</Link></div>
      )}

      <NextUp />

      {pick && (
        <Sheet title="Current fair" onClose={() => setPick(false)}>
          <div className="stack">
            {fairs?.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={session?.fairId === f.id}
                style={{ justifyContent: 'space-between', borderRadius: 10, minHeight: 48 }}
                onClick={() => void setSession(session?.fairId === f.id ? null : f.id, session?.hall ?? '')}>
                <span>{f.name}{suggestion?.id === f.id ? ' · next' : ''}</span>
                <span className="small">{f.city} · {f.startDate.slice(5)}</span>
              </button>
            ))}
            <input className="input" placeholder="Hall, e.g. 9" value={session?.hall ?? ''}
              onChange={(e) => void setSession(session?.fairId ?? null, e.target.value)} />
            <Link className="small muted" to="/settings">Edit fairs in Settings</Link>
            <button type="button" className="btn btn--primary" onClick={() => setPick(false)}>Done</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
