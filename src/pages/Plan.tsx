import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PriorityBadge, SalesChance, TagChips } from '../components/LeadBadges';
import { Icon } from '../components/Icon';
import {
  AFTER_FAIR, CHECKLIST, EXHIBITORS, EXHIBITOR_NOTE, FAIR_DAYS, GAME_PLAN_MOTTO, HALLS, HALL_LEVEL_LABEL, SKIP_LIST, TIMELINE,
  type Exhibitor, type HallInfo, type TimelineItem,
} from '../constants/guide';
import { useProducts } from '../hooks/useData';
import { useKv } from '../hooks/useKv';
import { fairDayNumber, localDate, planDay } from '../services/followup';
import { productTitle } from '../services/format';
import type { Product } from '../types/models';

type Tab = 'timeline' | 'halls' | 'exhibitors' | 'checklist';
type ExStatus = 'visited' | 'skip';

const hallKey = (hall: string) => hall.match(/\d+/)?.[0] ?? hall.trim().toLowerCase();

function visitLink(e: Exhibitor): string {
  const q = new URLSearchParams({ company: e.name, hall: e.hall.split('–')[0], tags: e.tags.join(',') });
  if (e.booth) q.set('no', e.booth);
  return `/stand?${q.toString()}`;
}

function TimelineRow({ item, done, time, current, onToggle, onTime }: {
  item: TimelineItem; done: boolean; time: string; current: boolean; onToggle: () => void; onTime: (t: string) => void;
}) {
  return (
    <li className={`tl-item${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
      <button type="button" className="tl-check" aria-pressed={done} aria-label={done ? 'Mark as open' : 'Mark as done'} onClick={onToggle}>{done ? '✓' : ''}</button>
      <div className="tl-body">
        <div className="row row--between">
          <input className="tl-time" type="time" value={time} onChange={(e) => onTime(e.target.value)} aria-label="Time" data-no-translate />
          {item.tags && item.tags.length > 0 && <TagChips projects={item.tags} />}
        </div>
        <strong className="tl-title">{item.title}</strong>
        <p className="small muted">{item.text}</p>
        {item.hall && /\d/.test(item.hall) && <Link className="chip chip--sm" to={`/products?hall=${hallKey(item.hall)}`}>Leads in Hall {hallKey(item.hall)}</Link>}
      </div>
    </li>
  );
}

function Timeline({ products }: { products: Product[] }) {
  const today = new Date();
  const [day, setDay] = useState<1 | 2 | 3>(planDay(today));
  const [done, setDone] = useKv<Record<string, boolean>>('planDone', {});
  const [times, setTimes] = useKv<Record<string, string>>('planTimes', {});
  const dayInfo = FAIR_DAYS[day - 1];
  const isToday = fairDayNumber(today) === day;
  const items = useMemo(
    () => TIMELINE.filter((t) => t.day === day).map((t) => ({ ...t, time: times[t.id] ?? t.time })).sort((a, b) => a.time.localeCompare(b.time)),
    [day, times],
  );
  const nowHm = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const nextId = items.find((t) => !done[t.id] && (!isToday || t.time >= nowHm))?.id ?? items.find((t) => !done[t.id])?.id;
  const round2 = useMemo(
    () => (day >= 2 ? products.filter((p) => !p.archivedAt && p.priority === 'A' && localDate(p.createdAt) < dayInfo.date) : []),
    [products, day, dayInfo.date],
  );

  return (
    <div className="stack">
      <div className="chips">
        {FAIR_DAYS.map((d) => (
          <button key={d.day} type="button" className="chip" aria-pressed={day === d.day} onClick={() => setDay(d.day)}>
            {d.label}{fairDayNumber(today) === d.day ? ' · today' : ''}
          </button>
        ))}
      </div>
      {fairDayNumber(today) === 0 && day === 1 && <p className="hint-box small">Die Messe beginnt am Di 27.10. Zeiten und Räume vor Ort bestätigen („actual situation on site shall prevail“).</p>}
      <ul className="timeline">
        {items.map((it) => (
          <TimelineRow key={it.id} item={it} done={Boolean(done[it.id])} time={it.time} current={it.id === nextId}
            onToggle={() => setDone((cur) => ({ ...cur, [it.id]: !cur[it.id] }))}
            onTime={(t) => setTimes((cur) => ({ ...cur, [it.id]: t }))} />
        ))}
      </ul>
      {day >= 2 && (
        <section className="card stack round2">
          <h3>Zweite Runde · A-Leads von gestern</h3>
          {round2.length === 0
            ? <p className="small muted">Noch keine A-Leads. Setze im Lead Priorität A, dann erscheinen sie hier.</p>
            : round2.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="list-row">
                <PriorityBadge priority="A" />
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 600 }}>{p.supplier.company || productTitle(p)}</div>
                  <div className="small muted truncate">{[p.hall && `Hall ${p.hall}`, p.supplier.boothNumber && `Booth ${p.supplier.boothNumber}`, p.name].filter(Boolean).join(' · ')}</div>
                </div>
                <SalesChance p={p} />
              </Link>
            ))}
          <p className="small muted">Nachverhandeln, Muster klären. Viele geben am Ende bessere Preise.</p>
        </section>
      )}
      <p className="small muted">{GAME_PLAN_MOTTO}</p>
    </div>
  );
}

function ExhibitorCard({ e, status, onStatus, hasLead }: {
  e: Exhibitor; status?: ExStatus; onStatus: (s: ExStatus | null) => void; hasLead?: Product;
}) {
  return (
    <div className={`card stack exhibitor${status ? ` is-${status}` : ''}`}>
      <div className="row row--between">
        <div className="row"><span className={`prio prio--${e.prio}`}>{e.prio}</span><strong>{e.name}</strong></div>
        <span className="mono">{`Hall ${e.hall}${e.booth ? ` · #${e.booth}` : ''}`}</span>
      </div>
      <div className="row row--between"><TagChips projects={e.tags} />{hasLead && <Link className="small" to={`/product/${hasLead.id}`}>Lead exists →</Link>}</div>
      <p className="small">{e.why}</p>
      {e.ask.length > 0 && <ul className="plain-list small">{e.ask.map((a) => <li key={a}>{a}</li>)}</ul>}
      <div className="row row--wrap">
        <Link className="btn btn--pink" to={visitLink(e)}><Icon name="store" />Visit</Link>
        <button type="button" className="btn" aria-pressed={status === 'visited'} onClick={() => onStatus(status === 'visited' ? null : 'visited')}>{status === 'visited' ? '✓ Visited' : 'Visited'}</button>
        <button type="button" className="btn btn--quiet" aria-pressed={status === 'skip'} onClick={() => onStatus(status === 'skip' ? null : 'skip')}>{status === 'skip' ? 'Skipped' : 'Skip'}</button>
      </div>
    </div>
  );
}

function Exhibitors({ products }: { products: Product[] }) {
  const [status, setStatus] = useKv<Record<string, ExStatus>>('exhibitorStatus', {});
  const [params] = useSearchParams();
  const hallFilter = params.get('hall');
  const [prio, setPrio] = useState<'all' | 'A'>('all');
  const tileOf = (key: string) => HALLS.find((h) => h.halls.includes(key))?.id ?? key;
  const list = EXHIBITORS.filter((e) => (!hallFilter || tileOf(hallFilter) === tileOf(hallKey(e.hall))) && (prio === 'all' || e.prio === 'A'));
  const lead = (e: Exhibitor) => products.find((p) => !p.archivedAt && p.supplier.company.toLowerCase().includes(e.name.toLowerCase().split(' ')[0]));
  const done = EXHIBITORS.filter((e) => status[e.id] === 'visited').length;
  const groups = [...new Set(list.map((e) => e.hall))];
  return (
    <div className="stack">
      <div className="row row--between row--wrap">
        <div className="chips">
          <button type="button" className="chip" aria-pressed={prio === 'all'} onClick={() => setPrio('all')}>All</button>
          <button type="button" className="chip" aria-pressed={prio === 'A'} onClick={() => setPrio('A')}>A only</button>
        </div>
        <span className="small muted">{done} / {EXHIBITORS.length} visited</span>
      </div>
      {hallFilter && <p className="hint-box small">Hall {hallFilter}. <Link to="/plan?tab=exhibitors">Show all</Link></p>}
      {groups.map((h) => (
        <section key={h} className="stack">
          <h3 className="group-title">Hall {h}</h3>
          {list.filter((e) => e.hall === h).map((e) => (
            <ExhibitorCard key={e.id} e={e} status={status[e.id]} hasLead={lead(e)}
              onStatus={(s) => setStatus((cur) => { const next = { ...cur }; if (s) next[e.id] = s; else delete next[e.id]; return next; })} />
          ))}
        </section>
      ))}
      <p className="small muted">{EXHIBITOR_NOTE}</p>
    </div>
  );
}

function Halls({ products }: { products: Product[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const count = (h: HallInfo) => products.filter((p) => !p.archivedAt && h.halls.includes(hallKey(p.hall))).length;
  return (
    <div className="stack">
      <div className="hall-grid">
        {HALLS.map((h) => (
          <button key={h.id} type="button" className={`hall hall--${h.level}${open === h.id ? ' is-open' : ''}`} aria-expanded={open === h.id} onClick={() => setOpen(open === h.id ? null : h.id)}>
            <span className="hall__level">{HALL_LEVEL_LABEL[h.level]}</span>
            <strong>{h.title}</strong>
            <span className="small">{h.sub}</span>
            {count(h) > 0 && <span className="hall__count">{count(h)} lead{count(h) > 1 ? 's' : ''}</span>}
          </button>
        ))}
      </div>
      {HALLS.filter((h) => h.id === open).map((h) => (
        <div key={h.id} className="card stack">
          <strong>{h.title}</strong>
          <p className="small">{h.note}</p>
          <div className="row row--wrap">
            <Link className="btn" to={`/plan?tab=exhibitors&hall=${h.halls[h.halls.length - 1]}`}>Exhibitors</Link>
            <Link className="btn" to={`/products?hall=${h.halls[h.halls.length - 1]}`}>Leads here</Link>
          </div>
        </div>
      ))}
      <div className="hint-box small">South Lobby: Badge holen. <br />{SKIP_LIST}</div>
    </div>
  );
}

function Checklist() {
  const [checked, setChecked] = useKv<Record<string, boolean>>('checklist', {});
  const [after, setAfter] = useKv<Record<string, boolean>>('afterFair', {});
  const row = (id: string, label: string, map: Record<string, boolean>, set: (fn: (c: Record<string, boolean>) => Record<string, boolean>) => void) => (
    <label key={id} className="check-row">
      <input type="checkbox" checked={Boolean(map[id])} onChange={() => set((c) => ({ ...c, [id]: !c[id] }))} />
      <span>{label}</span>
    </label>
  );
  return (
    <div className="stack">
      <section className="card stack"><h3>🎒 Checkliste</h3>{CHECKLIST.map((c) => row(c, c, checked, setChecked))}</section>
      <section className="card stack"><h3>🏁 Nach der Messe</h3>{AFTER_FAIR.map((c) => row(c, c, after, setAfter))}</section>
      <p className="small muted">Keine Pass- oder Ausweisdaten werden in der App gespeichert. „Reisepass“ ist nur ein Häkchen.</p>
    </div>
  );
}

export default function Plan() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'timeline';
  const products = useProducts() ?? [];
  const tabs: [Tab, string][] = [['timeline', 'Timeline'], ['halls', 'Halls'], ['exhibitors', 'Exhibitors'], ['checklist', 'Checklist']];
  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Plan</h1></div>
      <div className="chips tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" className="chip" aria-pressed={tab === id} onClick={() => setParams(id === 'timeline' ? {} : { tab: id }, { replace: true })}>{label}</button>
        ))}
      </div>
      {tab === 'timeline' && <Timeline products={products} />}
      {tab === 'halls' && <Halls products={products} />}
      {tab === 'exhibitors' && <Exhibitors products={products} />}
      {tab === 'checklist' && <Checklist />}
    </div>
  );
}
