import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NUMBERS, PHRASES, PHRASE_CATS, PHRASE_TRICK, type Phrase, type PhraseCat } from '../constants/guide';
import { useKv } from '../hooks/useKv';
import { Icon } from './Icon';

/* ---------- speech (iPhone has a Chinese voice; falls back silently) ---------- */

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speakChinese(text: string): void {
  if (!canSpeak()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function usePhraseFavs() {
  return useKv<string[]>('phraseFavs', []);
}

/* ---------- full screen "show this to the vendor" ---------- */

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => { void lock?.release().catch(() => {}); };
  }, [active]);
}

export interface ShowItem {
  key: string;
  zh?: string;
  py?: string;
  en?: string;
  de?: string;
  /** Large plain text (English pitch lines). */
  big?: string;
  speak?: string;
}

const toShow = (p: Phrase): ShowItem => ({ key: p.id, zh: p.zh, py: p.py, en: p.en, de: p.de, speak: p.zh });

/** White, high-contrast screen with very large text. Swipe or use the arrows for the next card. */
export function ShowScreen({ items, index, onIndex, onClose, favs, onFav }: {
  items: ShowItem[]; index: number; onIndex: (i: number) => void; onClose: () => void;
  favs?: string[]; onFav?: (key: string) => void;
}) {
  const item = items[index];
  const start = useRef<number | null>(null);
  useWakeLock(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onIndex, onClose]);
  if (!item) return null;
  const isFav = favs?.includes(item.key);
  const long = (item.zh?.length ?? 0) > 12;
  return (
    <div className="show" role="dialog" aria-modal="true"
      onPointerDown={(e) => { start.current = e.clientX; }}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (dx < -70 && index < items.length - 1) onIndex(index + 1);
        else if (dx > 70 && index > 0) onIndex(index - 1);
      }}>
      <div className="show__top" data-no-translate>
        <button type="button" className="show__btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <span className="show__count">{index + 1} / {items.length}</span>
        {onFav && <button type="button" className={`show__btn${isFav ? ' is-on' : ''}`} aria-pressed={isFav} aria-label="Favourite" onClick={() => onFav(item.key)}>★</button>}
      </div>
      <div className="show__body">
        {item.zh && <div className={`show__zh${long ? ' show__zh--long' : ''}`} lang="zh-CN" data-no-translate>{item.zh}</div>}
        {item.py && <div className="show__py" data-no-translate>{item.py}</div>}
        {item.big && <div className="show__big">{item.big}</div>}
        {item.en && <div className="show__en">{item.en}</div>}
        {item.de && <div className="show__de">{item.de}</div>}
      </div>
      <div className="show__nav" data-no-translate>
        <button type="button" className="show__btn" disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Previous"><Icon name="back" /></button>
        {canSpeak() && item.speak
          ? <button type="button" className="show__speak" onClick={() => speakChinese(item.speak!)}>🔊 Play</button>
          : <span />}
        <button type="button" className="show__btn" disabled={index === items.length - 1} onClick={() => onIndex(index + 1)} aria-label="Next"><Icon name="next" /></button>
      </div>
    </div>
  );
}

/* ---------- number strip ---------- */

export function NumberStrip({ onShow }: { onShow: (i: number) => void }) {
  return (
    <div className="number-strip" data-no-translate>
      {NUMBERS.map((n, i) => (
        <button key={n.n} type="button" className="number-chip" onClick={() => onShow(i)}>
          <span className="number-chip__zh" lang="zh-CN">{n.zh}</span>
          <span className="number-chip__n">{n.n}</span>
        </button>
      ))}
    </div>
  );
}

export const numberItems = (): ShowItem[] => NUMBERS.map((n) => ({ key: `n${n.n}`, zh: n.zh, py: n.py, big: n.n, speak: n.zh }));

/* ---------- list ---------- */

type Tab = 'fav' | PhraseCat;

/** Category tabs, favourites and the number strip. Tap a card to show it full screen. */
export function PhraseList({ initialIds }: { initialIds?: string[] }) {
  const [favs, setFavs] = usePhraseFavs();
  const [tab, setTab] = useState<Tab>(favs.length ? 'fav' : 'greet');
  const [show, setShow] = useState<{ items: ShowItem[]; index: number } | null>(null);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const base = initialIds ? PHRASES.filter((p) => initialIds.includes(p.id)) : tab === 'fav' ? PHRASES.filter((p) => favs.includes(p.id)) : PHRASES.filter((p) => p.cat === tab);
    const needle = q.trim().toLowerCase();
    return needle ? PHRASES.filter((p) => `${p.zh} ${p.py} ${p.en} ${p.de}`.toLowerCase().includes(needle)) : base;
  }, [tab, favs, q, initialIds]);

  const toggleFav = (key: string) => setFavs((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]));
  const open = (i: number) => setShow({ items: list.map(toShow), index: i });

  return (
    <div className="stack">
      <NumberStrip onShow={(i) => setShow({ items: numberItems(), index: i })} />
      {!initialIds && (
        <>
          <input className="input" type="search" placeholder="Search phrase" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search phrase" />
          <div className="chips tabs" role="tablist">
            <button type="button" role="tab" className="chip" aria-pressed={tab === 'fav'} onClick={() => { setTab('fav'); setQ(''); }}>★ Favourites{favs.length ? ` ${favs.length}` : ''}</button>
            {PHRASE_CATS.map((c) => (
              <button key={c.id} type="button" role="tab" className="chip" aria-pressed={tab === c.id} onClick={() => { setTab(c.id); setQ(''); }}>{c.label}</button>
            ))}
          </div>
        </>
      )}
      {list.length === 0 && <div className="empty">{tab === 'fav' && !q ? 'Tap ★ on a card to keep your most used phrases here.' : 'Nothing found.'}</div>}
      <div className="phrase-list">
        {list.map((p, i) => (
          <div key={p.id} className="phrase-card">
            <button type="button" className="phrase-card__main" onClick={() => open(i)}>
              <span className="phrase-card__zh" lang="zh-CN" data-no-translate>{p.zh}</span>
              <span className="phrase-card__py" data-no-translate>{p.py}</span>
              <span className="phrase-card__en">{p.en}</span>
              <span className="phrase-card__de muted small">{p.de}</span>
            </button>
            <button type="button" className={`phrase-card__fav${favs.includes(p.id) ? ' is-on' : ''}`} aria-pressed={favs.includes(p.id)} aria-label="Favourite" onClick={() => toggleFav(p.id)}>★</button>
          </div>
        ))}
      </div>
      {!initialIds && <p className="small muted">{PHRASE_TRICK}</p>}
      {show && <ShowScreen items={show.items} index={show.index} onIndex={(i) => setShow({ ...show, index: i })} onClose={() => setShow(null)} favs={favs} onFav={toggleFav} />}
    </div>
  );
}

/** Opens one phrase full screen (used by the stand steps and the deal helper). */
export function usePhraseShow(): { open: (phraseId: string) => void; node: ReactNode } {
  const [id, setId] = useState<string | null>(null);
  const [favs, setFavs] = usePhraseFavs();
  const p = PHRASES.find((x) => x.id === id);
  return {
    open: setId,
    node: p ? (
      <ShowScreen items={[toShow(p)]} index={0} onIndex={() => {}} onClose={() => setId(null)} favs={favs}
        onFav={(k) => setFavs((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))} />
    ) : null,
  };
}

/** Opens a list of plain English lines full screen. */
export function useBigText(): { open: (lines: string[], index: number) => void; node: ReactNode } {
  const [state, setState] = useState<{ lines: string[]; index: number } | null>(null);
  return {
    open: (lines, index) => setState({ lines, index }),
    node: state ? (
      <ShowScreen items={state.lines.map((t, i) => ({ key: `t${i}`, big: t }))} index={state.index}
        onIndex={(i) => setState({ ...state, index: i })} onClose={() => setState(null)} />
    ) : null,
  };
}
