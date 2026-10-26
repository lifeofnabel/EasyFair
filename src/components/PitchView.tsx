import { useEffect, useState } from 'react';
import { OPENER, PITCHES, TALK_TIPS } from '../constants/guide';
import { useKv } from '../hooks/useKv';
import type { ProjectId } from '../types/models';

/** Teleprompter: big text on a dark screen, size adjustable, screen stays on. */
function Teleprompter({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const [size, setSize] = useKv<number>('pitchSize', 30);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request('screen').then((l) => { lock = l; }).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); void lock?.release().catch(() => {}); };
  }, [onClose]);
  return (
    <div className="prompter" role="dialog" aria-modal="true" aria-label={title}>
      <div className="prompter__bar">
        <button type="button" className="btn btn--small" onClick={onClose}>Close</button>
        <strong>{title}</strong>
        <div className="row">
          <button type="button" className="btn btn--small" onClick={() => setSize(Math.max(18, size - 4))} aria-label="Smaller text">A−</button>
          <button type="button" className="btn btn--small" onClick={() => setSize(Math.min(64, size + 4))} aria-label="Larger text">A+</button>
        </div>
      </div>
      <p className="prompter__text" style={{ fontSize: `${size}px` }}>{text}</p>
    </div>
  );
}

/** Opener plus the pitch for the lead's tag. Used on the Pitch page and as a sheet inside the stand conversation. */
export function PitchView({ initialTag }: { initialTag?: ProjectId | null }) {
  const first = PITCHES.find((p) => p.tag === initialTag)?.id ?? PITCHES[0].id;
  const [tab, setTab] = useState<string>(first);
  const [prompt, setPrompt] = useState<{ title: string; text: string } | null>(null);
  const pitch = PITCHES.find((p) => p.id === tab) ?? PITCHES[0];

  return (
    <div className="stack">
      <div className="card card--pink stack">
        <div className="row row--between"><span className="mono">Opener · overall</span>
          <button type="button" className="btn btn--small btn--pink" onClick={() => setPrompt({ title: 'Opener', text: OPENER })}>Teleprompter</button></div>
        <p className="pitch-text">“{OPENER}”</p>
      </div>

      <div className="chips tabs" role="tablist">
        {PITCHES.map((p) => (
          <button key={p.id} type="button" role="tab" className="chip" aria-pressed={tab === p.id} onClick={() => setTab(p.id)}>{p.title}</button>
        ))}
      </div>

      <div className="card stack">
        <div className="row row--between">
          <div><strong>{pitch.title}</strong> <span className="muted small">{pitch.sub}</span></div>
          <button type="button" className="btn btn--small btn--pink" onClick={() => setPrompt({ title: pitch.title, text: pitch.text })}>Teleprompter</button>
        </div>
        <p className="pitch-text">“{pitch.text}”</p>
        <p className="hint-box small">💡 {pitch.tip}</p>
      </div>

      <div className="stack">
        {TALK_TIPS.map((t) => (
          <div key={t.title} className="card">
            <strong>{t.title}</strong>
            <p className="small muted">{t.text}</p>
          </div>
        ))}
      </div>
      {prompt && <Teleprompter title={prompt.title} text={prompt.text} onClose={() => setPrompt(null)} />}
    </div>
  );
}
