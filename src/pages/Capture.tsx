import { useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryPicker, CategoryQuestions } from '../components/CategoryQuestions';
import {
  BusinessTypeEditor, InvestorEditor, MarketEditor, PricingEditor, ProjectsEditor, SeasonPurposeEditor,
} from '../components/Editors';
import { Icon } from '../components/Icon';
import { PhotoStrip, ShotButton } from '../components/PhotoShots';
import { QuickAnswers, RedFlagEditor } from '../components/StandSteps';
import { SuggestionReview, applySuggestion, suggestionLines, type SuggestionKey } from '../components/SuggestionReview';
import { SupplierEditor } from '../components/SupplierEditor';
import { TranslateButton } from '../components/Translate';
import { ChipSelect, Field, Stars, errorText, toast } from '../components/ui';
import { PRIORITIES } from '../constants/stand';
import { db } from '../db/db';
import { useCaptureDraft } from '../hooks/useCaptureDraft';
import { structureCapture, type StructureResult } from '../services/ai';
import type { Product } from '../types/models';

const STEPS = ['Photos', 'Note', 'Details'] as const;
const AI_WAIT_MS = 9000;

export default function Capture() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initialFiles = useRef<File[]>((location.state as { files?: File[] } | null)?.files ?? []);
  const { draft, draftRef, patch, update, setDraft, busy, restored, onFile, setPhoto, removePhoto, save, restart } = useCaptureDraft('capture', {
    sameBoothId: params.get('booth'), files: initialFiles.current, fresh: params.get('new') === '1',
  });
  const [step, setStep] = useState(0);
  const [structure, setStructure] = useState<StructureResult | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [rejected, setRejected] = useState<SuggestionKey[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Refs mirror the structuring state so "Save" right after the AI finished never sees stale values.
  const structureRef = useRef<StructureResult | null>(null);
  const rejectedRef = useRef<SuggestionKey[]>([]);
  const acceptedRef = useRef(false);
  const lastStructured = useRef('');
  const descriptionEdited = useRef(false);

  /** Title + description (+ field suggestions) from the note and the product photo. Runs again only when they changed. */
  async function runStructure(force = false): Promise<void> {
    const d = draftRef.current;
    if (!d) return;
    const productPhoto = d.photos.find((p) => p.kind === 'product');
    const key = `${d.voiceTranscript.trim()}|${productPhoto?.id ?? ''}`;
    if (key === '|' || (!force && key === lastStructured.current)) return;
    lastStructured.current = key;
    setStructuring(true);
    try {
      const blob = productPhoto ? (await db.photoBlobs.get(productPhoto.id))?.low : undefined;
      const result = await structureCapture(d.voiceTranscript, blob);
      structureRef.current = result;
      rejectedRef.current = [];
      acceptedRef.current = false;
      setStructure(result);
      setRejected([]);
      setAccepted(false);
      const s = result.suggestion;
      update((cur) => {
        const next = { ...cur };
        if (s.name && !cur.name.trim()) next.name = s.name;
        if (s.description && (!cur.description.trim() || !descriptionEdited.current)) next.description = s.description;
        if (result.source === 'ai') next.ai = { ...cur.ai, structuredAt: new Date().toISOString() };
        return next;
      });
    } finally {
      setStructuring(false);
    }
  }

  /** Waits for the AI at most a few seconds: the fair flow must never hang on a bad connection. */
  const settleStructure = () => Promise.race([runStructure(), new Promise<void>((r) => setTimeout(r, AI_WAIT_MS))]);

  function acceptSuggestion(): Product | null {
    const d = draftRef.current;
    const st = structureRef.current;
    if (!d || !st || acceptedRef.current) return d;
    const keys = suggestionLines(st.suggestion).map((l) => l.key).filter((k) => !rejectedRef.current.includes(k));
    const next = applySuggestion(d, st.suggestion, keys);
    next.name = d.name;
    next.description = d.description;
    acceptedRef.current = true;
    setDraft(next);
    setAccepted(true);
    return next;
  }

  function toggleSuggestion(k: SuggestionKey) {
    const r = rejectedRef.current.includes(k) ? rejectedRef.current.filter((x) => x !== k) : [...rejectedRef.current, k];
    rejectedRef.current = r;
    setRejected(r);
  }

  async function onSave() {
    if (!draftRef.current || saving) return;
    if (busy > 0) { toast('Photo is still being processed…'); return; }
    setSaving(true);
    try {
      if (step <= 1) await settleStructure();
      acceptSuggestion();
      const p = await save();
      toast('Saved ✓');
      navigate('/', { replace: true, state: { savedId: p.id } });
    } catch (err) {
      toast(errorText(err), { error: true });
      setSaving(false);
    }
  }

  async function next() {
    if (step === 1) {
      await settleStructure();
      acceptSuggestion();
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  if (!draft) return <div className="page"><div className="skeleton" style={{ height: 220 }} /></div>;
  const boothSource = params.get('booth');
  const hasPhoto = draft.photos.some((p) => p.kind === 'product');

  return (
    <div className="page page--narrow capture">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => (step ? setStep(step - 1) : navigate(-1))}><Icon name="back" /></button>
        <h1>{STEPS[step]}</h1>
        <div className="row">
          <span className="mono">{step + 1}/{STEPS.length}</span>
          <TranslateButton />
        </div>
      </div>
      <div className="steps" aria-hidden>{STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}</div>
      {restored && (
        <div className="hint-box row row--between row--wrap">
          <span>Draft restored.</span>
          <button type="button" className="btn btn--small" onClick={() => { void restart(); setStep(0); }}>Start new</button>
        </div>
      )}
      {boothSource && draft.supplier.company && <p className="small muted">Same booth: {draft.supplier.company}{draft.supplier.boothNumber ? ` · ${draft.supplier.boothNumber}` : ''}</p>}

      {step === 0 && (
        <>
          <div className="shot-grid">
            <ShotButton kind="product" label="Product photo" icon="📦" main onFile={onFile} />
            <ShotButton kind="info" label="Info · card · QR" icon="🪪" onFile={onFile} />
            <ShotButton kind="booth" label="Booth" icon="🏬" onFile={onFile} />
          </div>
          <ShotButton kind="other" label="Other photo" icon="🖼️" small onFile={onFile} />
          {busy > 0 && <p className="small muted">Processing photo…</p>}
          <PhotoStrip photos={draft.photos} onRemove={removePhoto} onSetPhoto={setPhoto} />
          <p className="small muted">Photos are optional. Everything is stored on this phone immediately.</p>
        </>
      )}

      {step === 1 && (
        <>
          <Field label="What do you want to remember?"
            note="Tap the 🎤 on your keyboard and just talk (German is fine). You get a title and a description automatically.">
            <textarea className="textarea textarea--note" autoFocus placeholder="e.g. Automatischer Soßenspender, interessant für Babel, ca. 500 Euro, B2B, Deutschland"
              value={draft.voiceTranscript} onChange={(e) => patch({ voiceTranscript: e.target.value })}
              onBlur={() => void runStructure()} />
          </Field>
          <button type="button" className="btn" disabled={structuring || (!draft.voiceTranscript.trim() && !hasPhoto)} onClick={() => void runStructure(true)}>
            <Icon name="sparkle" />{structuring ? 'Writing…' : 'Create title & description'}
          </button>
          <Field label="Title">
            <input className="input" placeholder={structuring ? 'Writing title…' : 'Title (written for you)'} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea className="textarea" placeholder={structuring ? 'Writing description…' : 'Short description (written for you)'} value={draft.description}
              onChange={(e) => { descriptionEdited.current = true; patch({ description: e.target.value }); }} />
          </Field>
          <Field label="Quick answers" note="Optional: one tap for facts you hear often.">
            <QuickAnswers p={draft} patch={patch} />
          </Field>
          {structure && (
            <SuggestionReview suggestion={structure.suggestion} source={structure.source} rejected={rejected} accepted={accepted}
              onToggle={toggleSuggestion}
              onAcceptAll={() => acceptSuggestion()} />
          )}
        </>
      )}

      {step === 2 && (
        <>
          <MarketEditor p={draft} onPatch={patch} />
          <BusinessTypeEditor p={draft} onPatch={patch} />
          <div className="field">
            <span className="field__label">Category</span>
            <CategoryPicker value={draft.categoryId} onChange={(categoryId) => patch({ categoryId, categoryAnswers: {} })} />
          </div>
          <CategoryQuestions mode="quick" categoryId={draft.categoryId} answers={draft.categoryAnswers}
            onChange={(categoryAnswers) => patch({ categoryAnswers })} />
          <ProjectsEditor p={draft} onPatch={patch} />
          <div className="field">
            <span className="field__label">Interest</span>
            <Stars value={draft.interest} onChange={(interest) => patch({ interest })} />
          </div>
          <Field label="Priority (optional)">
            <ChipSelect options={PRIORITIES} value={draft.priority} onChange={(priority) => patch({ priority })} />
          </Field>
          <details className="card">
            <summary>Supplier {draft.supplier.company ? `· ${draft.supplier.company}` : ''}</summary>
            <SupplierEditor supplier={draft.supplier} onChange={(supplier) => patch({ supplier })} photos={draft.photos}
              onPhotoPatch={setPhoto} />
          </details>
          <details className="card">
            <summary>More details</summary>
            <div className="stack">
              <CategoryQuestions mode="more" categoryId={draft.categoryId} answers={draft.categoryAnswers}
                onChange={(categoryAnswers) => patch({ categoryAnswers })} />
              <SeasonPurposeEditor p={draft} onPatch={patch} />
              <PricingEditor p={draft} onPatch={patch} />
              <InvestorEditor p={draft} onPatch={patch} />
              <Field label="Red flags"><RedFlagEditor value={draft.redFlags} onChange={(redFlags) => patch({ redFlags })} /></Field>
              <textarea className="textarea" placeholder="My note" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </div>
          </details>
        </>
      )}

      <div className="sticky-actions">
        {step < STEPS.length - 1 && <button type="button" className="btn btn--big" disabled={saving} onClick={() => void onSave()}>Save</button>}
        {step < STEPS.length - 1
          ? <button type="button" className="btn btn--big btn--primary" disabled={saving || structuring} onClick={() => void next()}>{structuring ? 'Writing…' : 'Next'}{!structuring && <Icon name="next" />}</button>
          : <button type="button" className="btn btn--big btn--pink" disabled={saving} onClick={() => void onSave()}>{saving ? 'Saving…' : 'Save product'}</button>}
      </div>
    </div>
  );
}
