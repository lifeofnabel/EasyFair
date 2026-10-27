import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PriorityBadge, RedFlagBanner, SalesChance } from '../components/LeadBadges';
import { PhotoStrip, QuickShots } from '../components/PhotoShots';
import { PhraseList, usePhraseShow } from '../components/PhraseCards';
import { PitchView } from '../components/PitchView';
import { RedFlagEditor, StandStepBody } from '../components/StandSteps';
import { SupplierEditor } from '../components/SupplierEditor';
import { TranslateButton } from '../components/Translate';
import { ChipMulti, ChipSelect, Field, Sheet, Stars, errorText, toast } from '../components/ui';
import { PROJECTS } from '../constants/options';
import { PRIORITIES, STAND_BANNER, STAND_LIMIT_SEC, STAND_STEPS, bestTierPrice } from '../constants/stand';
import { useCaptureDraft } from '../hooks/useCaptureDraft';
import type { Product, ProjectId } from '../types/models';

const WRAP = STAND_STEPS.length; // index of the wrap-up screen
const CORE_TAGS = PROJECTS.filter((p) => ['hala', 'lokka', 'mts', 'robo'].includes(p.id));

function answered(n: number, p: Product): boolean {
  const s = p.stand;
  switch (n) {
    case 1: return Boolean(s.supplierType);
    case 2: return Boolean(p.name.trim() || s.certs?.length);
    case 3: return p.pricing.moq !== undefined;
    case 4: return Boolean(s.tiers?.q100 || s.tiers?.q500 || s.tiers?.q1000);
    case 5: return s.sample !== undefined;
    case 6: return s.leadTimeDays !== undefined;
    case 7: return Boolean(s.payment || s.incoterm);
    case 8: return Boolean(s.deDistributor);
    default: return false;
  }
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function Stand() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from');
  const company = params.get('company');
  const { draft, update, patch, busy, restored, onFile, setPhoto, removePhoto, save, restart } = useCaptureDraft('stand', {
    sameBoothId: from, fresh: params.get('new') === '1' || Boolean(company),
  });
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<'phrases' | 'pitch' | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const phrase = usePhraseShow();
  const prefilled = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Visit from the plan: company, hall, booth and tags come pre-filled.
  useEffect(() => {
    if (!draft || prefilled.current || !company) return;
    prefilled.current = true;
    const tags = (params.get('tags') ?? '').split(',').filter(Boolean) as ProjectId[];
    update((p) => ({
      ...p,
      supplier: { ...p.supplier, company, boothNumber: params.get('no') ?? p.supplier.boothNumber },
      hall: params.get('hall') ?? p.hall,
      projects: tags.length ? tags : p.projects,
    }));
  }, [draft, company, params, update]);

  const secs = Math.max(0, Math.floor((now - startedAt) / 1000));
  const timerClass = secs >= STAND_LIMIT_SEC ? 'timer timer--over' : secs >= STAND_LIMIT_SEC * 0.8 ? 'timer timer--warn' : 'timer';
  const info = STAND_STEPS[step];
  const progress = useMemo(() => (draft ? STAND_STEPS.map((s) => answered(s.n, draft)) : []), [draft]);

  if (!draft) return <div className="page"><div className="skeleton" style={{ height: 240 }} /></div>;

  const go = (i: number) => { setStep(Math.max(0, Math.min(WRAP, i))); setHint(false); window.scrollTo({ top: 0 }); };
  const next = () => go(step + 1);
  const setSupplier = (changes: Partial<Product['supplier']>) => update((p) => ({ ...p, supplier: { ...p.supplier, ...changes } }));

  async function onSave() {
    if (saving) return;
    if (busy > 0) { toast('Photo is still being processed…'); return; }
    setSaving(true);
    try {
      const p = await save((d) => {
        const price = bestTierPrice(d.stand);
        const pricing = d.pricing.supplierPrice === undefined && price !== undefined ? { ...d.pricing, supplierPrice: price } : d.pricing;
        return { ...d, pricing, name: d.name.trim() || d.supplier.company.trim() };
      });
      toast('Lead saved ✓');
      navigate('/', { replace: true, state: { savedId: p.id } });
    } catch (err) {
      toast(errorText(err), { error: true });
      setSaving(false);
    }
  }

  return (
    <div className="page page--narrow stand">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => (step > 0 ? go(step - 1) : navigate(-1))}><Icon name="back" /></button>
        <h1>Stand talk</h1>
        <div className="row">
          <button type="button" className={timerClass} onClick={() => setStartedAt(Date.now())} aria-label="Timer, tap to restart" data-no-translate>{mmss(secs)}</button>
          <TranslateButton />
        </div>
      </div>
      <p className="stand-banner">{STAND_BANNER}</p>

      {restored && (
        <div className="hint-box row row--between row--wrap">
          <span>Draft restored.</span>
          <button type="button" className="btn btn--small" onClick={() => { void restart(); setStep(0); }}>Start new stand</button>
        </div>
      )}

      <div className="card stand-head stack">
        <input className="input input--lg" placeholder="Company" autoCapitalize="words" value={draft.supplier.company}
          onChange={(e) => setSupplier({ company: e.target.value })} aria-label="Company" />
        <div className="grid-2">
          <input className="input" placeholder="Hall" inputMode="numeric" value={draft.hall} onChange={(e) => patch({ hall: e.target.value })} aria-label="Hall" />
          <input className="input" placeholder="Booth" value={draft.supplier.boothNumber} onChange={(e) => setSupplier({ boothNumber: e.target.value })} aria-label="Booth" />
        </div>
        <QuickShots onFile={onFile} busy={busy > 0} />
        <div className="row">
          <button type="button" className="btn grow" onClick={() => setSheet('phrases')}><span lang="zh-CN" data-no-translate>中文</span> Phrases</button>
          <button type="button" className="btn grow" onClick={() => setSheet('pitch')}>Pitch</button>
        </div>
      </div>

      <RedFlagBanner p={draft} />

      <div className="stepper" role="tablist" aria-label="Steps">
        {STAND_STEPS.map((s, i) => (
          <button key={s.id} type="button" role="tab" aria-selected={step === i} aria-label={`Step ${s.n}: ${s.title}`}
            className={`stepper__dot${progress[i] ? ' is-done' : ''}${step === i ? ' is-current' : ''}`} onClick={() => go(i)}>{s.n}</button>
        ))}
        <button type="button" role="tab" aria-selected={step === WRAP} className={`stepper__dot stepper__dot--end${step === WRAP ? ' is-current' : ''}`} onClick={() => go(WRAP)} aria-label="Wrap-up">✓</button>
      </div>

      {step < WRAP && info && (
        <div className="card stack stand-card">
          <div className="row row--between">
            <span className="mono">Question {info.n} / {STAND_STEPS.length}</span>
            <div className="row">
              <button type="button" className="btn btn--small" onClick={() => phrase.open(info.phraseId)}><span lang="zh-CN" data-no-translate>中文</span> Show</button>
              <button type="button" className={`hint-btn${hint ? ' is-on' : ''}`} aria-expanded={hint} aria-label="Hint" onClick={() => setHint(!hint)}>?</button>
            </div>
          </div>
          <h2 className="stand-card__title">{info.title}</h2>
          {hint && <p className="hint-box">{info.hint}</p>}
          <StandStepBody step={info.n} p={draft} patch={patch} onPicked={() => setTimeout(() => go(step + 1), 240)} />
        </div>
      )}

      {step === WRAP && (
        <div className="stack--lg">
          <SalesChance p={draft} big />
          <div className="card stack">
            <h3>Wrap-up</h3>
            <Field label="Priority">
              <div className="row"><ChipSelect big options={PRIORITIES} value={draft.priority} onChange={(priority) => patch({ priority })} />
                <PriorityBadge priority={draft.priority} big /></div>
            </Field>
            <Field label="Tags">
              <ChipMulti big options={CORE_TAGS} value={draft.projects} onChange={(projects) => patch({ projects })} />
            </Field>
            <Field label="Interest"><Stars value={draft.interest} onChange={(interest) => patch({ interest })} /></Field>
          </div>
          <details className="card" open>
            <summary>Contact · WeChat · card</summary>
            <SupplierEditor supplier={draft.supplier} onChange={(supplier) => patch({ supplier })} photos={draft.photos} onPhotoPatch={setPhoto} />
          </details>
          <details className="card">
            <summary>Red flags {draft.redFlags.length ? `· ${draft.redFlags.length}` : ''}</summary>
            <RedFlagEditor value={draft.redFlags} onChange={(redFlags) => patch({ redFlags })} />
          </details>
          <Field label="Note">
            <textarea className="textarea" placeholder="Anything else worth remembering" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
          <PhotoStrip photos={draft.photos} onRemove={removePhoto} onSetPhoto={setPhoto} />
        </div>
      )}

      <div className="sticky-actions">
        {step < WRAP ? (
          <>
            <button type="button" className="btn btn--big" onClick={next}>Skip</button>
            <button type="button" className="btn btn--big btn--primary" onClick={next}>Next<Icon name="next" /></button>
          </>
        ) : (
          <button type="button" className="btn btn--big btn--pink" disabled={saving} onClick={() => void onSave()}>{saving ? 'Saving…' : 'Save lead'}</button>
        )}
      </div>

      {sheet === 'phrases' && <Sheet title="中文 Phrases" onClose={() => setSheet(null)}><PhraseList /></Sheet>}
      {sheet === 'pitch' && <Sheet title="Pitch" onClose={() => setSheet(null)}><PitchView initialTag={draft.projects[0]} /></Sheet>}
      {phrase.node}
    </div>
  );
}
