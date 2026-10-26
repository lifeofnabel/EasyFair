import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PriorityBadge, SalesChance } from '../components/LeadBadges';
import { PhotoImg, ProductCard, mainPhoto } from '../components/ProductCard';
import { Sheet, Stars } from '../components/ui';
import { FAIR_DAYS, TIMELINE } from '../constants/guide';
import { fairDay, suggestFair } from '../constants/fairs';
import { isSalesChance } from '../constants/stand';
import { kvSet } from '../db/db';
import { useFairs, useProducts } from '../hooks/useData';
import { useFairSession } from '../hooks/useFairSession';
import { useKv } from '../hooks/useKv';
import { dayStats, fairDayNumber, isOpenFollowUp, localDate, planDay } from '../services/followup';
import { categoryIcon, productTitle } from '../services/format';
import { useStore } from '../services/store';
import { syncNow, syncState } from '../services/sync';

const DAY_MS = 86_400_000;

/** The next open item of today's plan (or day 1 before the fair). */
function NextUp() {
  const [done, setDone] = useKv<Record<string, boolean>>('planDone', {});
  const [times] = useKv<Record<string, string>>('planTimes', {});
  const now = new Date();
  const dayNo = planDay(now);
  const isToday = fairDayNumber(now) === dayNo;
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const items = TIMELINE.filter((t) => t.day === dayNo).map((t) => ({ ...t, time: times[t.id] ?? t.time })).sort((a, b) => a.time.localeCompare(b.time));
  const next = items.find((t) => !done[t.id] && (!isToday || t.time >= nowHm)) ?? items.find((t) => !done[t.id]);
  const label = fairDayNumber(now) === 0 ? `Starts ${FAIR_DAYS[0].label.split('· ')[1]}` : FAIR_DAYS[dayNo - 1].label;
  if (!next) {
    return (
      <Link to="/plan" className="card nextup row row--between"><span><span className="mono">{label}</span><strong className="block">Plan done ✓</strong></span><Icon name="next" /></Link>
    );
  }
  return (
    <div className="card nextup row row--between">
      <Link to="/plan" className="grow nextup__link">
        <span className="mono">{label} · next up</span>
        <strong className="block">{next.time} · {next.title}</strong>
        <span className="small muted block">{next.text.length > 90 ? `${next.text.slice(0, 88)}…` : next.text}</span>
      </Link>
      <button type="button" className="tl-check" aria-label="Mark as done" onClick={() => setDone((cur) => ({ ...cur, [next.id]: true }))} />
    </div>
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
  const stats = useMemo(() => dayStats(active), [active]);
  const suggestion = fairs ? suggestFair(fairs) : null;
  const picked = fairs?.find((f) => f.id === session?.fairId) ?? null;
  const fair = picked ?? suggestion;
  const day = fair ? fairDay(fair) : null;
  const justSaved = (location.state as { savedId?: string } | null)?.savedId;
  const last = active[0] && Date.now() - new Date(active[0].createdAt).getTime() < DAY_MS ? active[0] : null;
  const salesChances = active.filter(isSalesChance).length;
  const open = active.filter(isOpenFollowUp).length;
  const high = active.filter((p) => p.interest >= 4 || p.priority === 'A').slice(0, 4);
  const review = active.filter((p) => p.needsReview).length;
  const setSession = (fairId: string | null, hall: string) => kvSet('fairSession', { fairId, hall });

  const onCamera = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length) navigate('/capture', { state: { files } });
  };

  const waiting = sync.uploadsEnabled ? sync.pendingPhotos : 0;
  const tiles = [
    { label: 'Leads today', value: stats.leads, to: `/products?day=${localDate(new Date())}` },
    { label: 'A-leads', value: active.filter((p) => p.priority === 'A').length, to: '/products?priority=A' },
    { label: '🚀 Sales chance', value: salesChances, to: '/products?salesChance=true' },
    { label: 'Follow-up open', value: open, to: '/followup' },
  ];

  return (
    <div className="page">
      <button type="button" className="card row row--between" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setPick(true)}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="mono">Current fair</span>
          <strong>{fair ? fair.name : 'No fair selected'}{fair && !picked ? ' · auto' : ''}</strong>
          <span className="small muted">
            {fair
              ? [fair.city, day ? `Day ${day}` : `${fair.startDate} – ${fair.endDate}`, session?.hall && `Hall ${session.hall}`].filter(Boolean).join(' · ')
              : 'Tap to set fair and hall once. Every lead gets it automatically.'}
          </span>
        </div>
        <Icon name="next" />
      </button>

      <NextUp />

      <div className="add-row">
        <Link to="/stand?new=1" className="btn btn--big btn--pink add-row__main"><Icon name="store" />STAND TALK</Link>
        <label className="btn btn--big add-row__cam" aria-label="Quick photo capture">
          <Icon name="camera" />
          <input type="file" accept="image/*" capture="environment" onChange={onCamera} />
        </label>
      </div>

      <div className="quick-links" role="navigation" aria-label="Shortcuts">
        <Link to="/phrases" className="chip"><span lang="zh-CN" data-no-translate>中文</span> Phrases</Link>
        <Link to="/pitch" className="chip">Pitch</Link>
        <Link to="/deal" className="chip">Deal</Link>
        <Link to="/plan" className="chip">Plan</Link>
        <Link to="/capture?new=1" className="chip">Quick note</Link>
      </div>

      {last && (
        <div className="card last-saved row" aria-live="polite">
          <Link to={`/product/${last.id}`} className="thumb"><PhotoImg photo={mainPhoto(last)} fallback={categoryIcon(last)} /></Link>
          <div className="grow">
            <div className="mono">{justSaved === last.id ? 'Saved ✓' : 'Last saved'}</div>
            <Link to={`/product/${last.id}`} className="truncate last-saved__title">{last.supplier.company || productTitle(last)}</Link>
            <div className="row"><Stars value={last.interest} size="sm" /><PriorityBadge priority={last.priority} /><SalesChance p={last} /></div>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <Link className="btn btn--small btn--pink" to={`/stand?from=${last.id}`}><Icon name="store" />Same booth</Link>
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

      <div className="card summary-card">
        <div className="summary-card__line">
          <strong>Today</strong>: {stats.leads} lead{stats.leads === 1 ? '' : 's'} · {stats.aLeads} A-lead{stats.aLeads === 1 ? '' : 's'} · <strong>{stats.open}</strong> open
        </div>
        <Link to="/followup" className="btn btn--small">{stats.open ? 'Send follow-ups' : 'Follow-up'}</Link>
      </div>

      <div className="stat-grid">
        {tiles.map((s) => (
          <Link key={s.label} to={s.to} className="stat">
            <span className="stat__value">{s.value}</span>
            <span className="mono">{s.label}</span>
          </Link>
        ))}
      </div>

      {review > 0 && (
        <Link to="/review" className="card row row--between" style={{ textDecoration: 'none' }}>
          <span><strong>{review}</strong> lead{review > 1 ? 's' : ''} to review</span>
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
          <div className="section-title"><h2>Top leads</h2><Link className="small muted" to="/products?priority=A">All A</Link></div>
          <div className="product-grid">{high.map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}</div>
        </section>
      )}
      {products && active.length === 0 && (
        <div className="empty">No leads yet. Tap STAND TALK at your first booth.<Link className="link-btn" to="/settings">Or load demo data in Settings</Link></div>
      )}

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
            <input className="input" placeholder="Hall, e.g. 15" value={session?.hall ?? ''}
              onChange={(e) => void setSession(session?.fairId ?? null, e.target.value)} />
            <Link className="small muted" to="/settings">Edit fairs in Settings</Link>
            <button type="button" className="btn btn--primary" onClick={() => setPick(false)}>Done</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
