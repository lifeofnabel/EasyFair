import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryPicker, CategoryQuestions } from '../components/CategoryQuestions';
import {
  BusinessTypeEditor, InvestorEditor, MarketEditor, PricingEditor, ProjectsEditor, SeasonPurposeEditor,
} from '../components/Editors';
import { Icon } from '../components/Icon';
import { PhotoImg } from '../components/ProductCard';
import { SuggestionReview, applySuggestion, suggestionLines, type SuggestionKey } from '../components/SuggestionReview';
import { SupplierEditor } from '../components/SupplierEditor';
import { TranslateButton } from '../components/Translate';
import { Field, Stars, errorText, toast } from '../components/ui';
import { INFO_TYPES } from '../constants/options';
import { db } from '../db/db';
import { attachStagedPhotos, discardPhotoBlobs, newCaptureProduct, saveNewProduct, stagePhoto } from '../db/repo';
import { structureCapture, type StructureResult } from '../services/ai';
import { decodeQr } from '../services/qr';
import { tap } from '../services/feedback';
import type { InfoType, Photo, PhotoKind, Product } from '../types/models';

const STEPS = ['Photos', 'Note', 'Details'] as const;
const AI_WAIT_MS = 9000;

function ShotButton({ kind, label, icon, main, small, onFile }: {
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

export default function Capture() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Product | null>(null);
  const [busy, setBusy] = useState(0);
  const [structure, setStructure] = useState<StructureResult | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [rejected, setRejected] = useState<SuggestionKey[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef(false);
  const staged = useRef<string[]>([]);
  const draftRef = useRef<Product | null>(null);
  draftRef.current = draft;
  // Refs mirror the structuring state so "Save" right after the AI finished never sees stale values.
  const structureRef = useRef<StructureResult | null>(null);
  const rejectedRef = useRef<SuggestionKey[]>([]);
  const acceptedRef = useRef(false);
  const lastStructured = useRef('');
  const descriptionEdited = useRef(false);
  const initialFiles = useRef<File[]>((location.state as { files?: File[] } | null)?.files ?? []);

  useEffect(() => {
    let alive = true;
    saved.current = false;
    (async () => {
      const boothId = params.get('booth');
      const src = boothId ? await db.products.get(boothId) : undefined;
      const p = await newCaptureProduct({ sameBoothAs: src });
      if (!alive) return;
      setDraft(p);
      const files = initialFiles.current;
      initialFiles.current = [];
      files.forEach((f) => void onFile(f, 'product'));
    })();
    // Leaving without "Save" never loses a capture: anything with a photo or a note is kept as a product.
    return () => {
      alive = false;
      if (saved.current) return;
      const d = draftRef.current;
      const hasContent = d && (d.photos.length || d.voiceTranscript.trim() || d.name.trim() || d.notes.trim());
      if (d && hasContent) {
        saved.current = true;
        void attachStagedPhotos(d.id, d.photos.map((ph) => ph.id)).then(() => saveNewProduct(d))
          .then(() => toast('Unsaved capture kept. Find it under Products.'));
      } else if (staged.current.length) {
        void discardPhotoBlobs(staged.current);
      }
      staged.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const patch = (changes: Partial<Product>) => setDraft((d) => (d ? { ...d, ...changes } : d));

  async function onFile(file: File, kind: PhotoKind) {
    setBusy((b) => b + 1);
    try {
      const photo = await stagePhoto(file, kind, kind === 'info' ? 'business_card' : undefined);
      staged.current.push(photo.id);
      setDraft((d) => (d ? { ...d, photos: [...d.photos, photo] } : d));
      tap();
      if (kind === 'info') {
        const blob = (await db.photoBlobs.get(photo.id))?.low;
        const qr = blob ? await decodeQr(blob).catch(() => null) : null;
        if (qr) setPhoto(photo.id, { infoType: 'qr', qrValue: qr });
      }
    } catch (err) {
      toast(errorText(err), { error: true });
    } finally {
      setBusy((b) => b - 1);
    }
  }

  const setPhoto = (id: string, changes: Partial<Photo>) =>
    setDraft((d) => (d ? { ...d, photos: d.photos.map((p) => (p.id === id ? { ...p, ...changes } : p)) } : d));

  const removePhoto = (id: string) => {
    setDraft((d) => (d ? { ...d, photos: d.photos.filter((p) => p.id !== id) } : d));
    staged.current = staged.current.filter((x) => x !== id);
    void discardPhotoBlobs([id]);
  };

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
      const cur = draftRef.current;
      if (cur) {
        const next = { ...cur };
        if (s.name && !cur.name.trim()) next.name = s.name;
        if (s.description && (!cur.description.trim() || !descriptionEdited.current)) next.description = s.description;
        if (result.source === 'ai') next.ai = { ...cur.ai, structuredAt: new Date().toISOString() };
        draftRef.current = next;
        setDraft(next);
      }
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
    draftRef.current = next;
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

  async function save() {
    if (!draftRef.current || saving) return;
    if (busy > 0) { toast('Photo is still being processed…'); return; }
    setSaving(true);
    try {
      if (step <= 1) await settleStructure();
      const finalProduct = acceptSuggestion() ?? draftRef.current!;
      await attachStagedPhotos(finalProduct.id, finalProduct.photos.map((ph) => ph.id));
      await saveNewProduct(finalProduct);
      saved.current = true;
      tap(true);
      toast('Saved ✓');
      navigate('/', { replace: true, state: { savedId: finalProduct.id } });
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
          {draft.photos.length > 0 && (
            <div className="stack">
              <div className="photo-strip">
                {draft.photos.map((ph) => (
                  <div key={ph.id} className="photo-tile">
                    <PhotoImg photo={ph} />
                    <button type="button" className="photo-tile__x" aria-label="Remove photo" onClick={() => removePhoto(ph.id)}>✕</button>
                    <div className="photo-tile__label">{ph.kind === 'info' ? INFO_TYPES.find((t) => t.id === ph.infoType)?.label : ph.kind}</div>
                  </div>
                ))}
              </div>
              {draft.photos.filter((p) => p.kind === 'info').map((ph) => (
                <div key={ph.id} className="row row--wrap">
                  <div className="thumb"><PhotoImg photo={ph} /></div>
                  <div className="chips grow">
                    {INFO_TYPES.map((t) => (
                      <button key={t.id} type="button" className="chip chip--sm" aria-pressed={ph.infoType === t.id}
                        onClick={() => setPhoto(ph.id, { infoType: t.id as InfoType })}>{t.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <textarea className="textarea" placeholder="My note" value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
            </div>
          </details>
        </>
      )}

      <div className="sticky-actions">
        {step < STEPS.length - 1 && <button type="button" className="btn btn--big" disabled={saving} onClick={() => void save()}>Save</button>}
        {step < STEPS.length - 1
          ? <button type="button" className="btn btn--big btn--primary" disabled={saving || structuring} onClick={() => void next()}>{structuring ? 'Writing…' : 'Next'}{!structuring && <Icon name="next" />}</button>
          : <button type="button" className="btn btn--big btn--pink" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save product'}</button>}
      </div>
    </div>
  );
}
