import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CategoryPicker, CategoryQuestions } from '../components/CategoryQuestions';
import {
  BusinessTypeEditor, InvestorEditor, MarketEditor, PricingEditor, ProjectsEditor, SeasonPurposeEditor,
} from '../components/Editors';
import { Icon } from '../components/Icon';
import { PhotoImg } from '../components/ProductCard';
import { SuggestionReview, applySuggestion, suggestionLines, type SuggestionKey } from '../components/SuggestionReview';
import { SupplierEditor } from '../components/SupplierEditor';
import { Stars, errorText, toast } from '../components/ui';
import { INFO_TYPES } from '../constants/options';
import { db } from '../db/db';
import {
  attachStagedPhotos, discardPhotoBlobs, newCaptureProduct, saveNewProduct, stagePhoto,
} from '../db/repo';
import { useSpeech } from '../hooks/useSpeech';
import { structureCapture, type StructureResult } from '../services/ai';
import { decodeQr } from '../services/qr';
import { loadSettings } from '../services/settings';
import type { InfoType, Photo, PhotoKind, Product } from '../types/models';

const STEPS = ['Photos', 'Voice', 'Details'] as const;

function ShotButton({ kind, label, icon, main, small, onFile }: { kind: PhotoKind; label: string; icon: string; main?: boolean; small?: boolean; onFile: (f: File, kind: PhotoKind) => void }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    files.forEach((f) => onFile(f, kind));
    e.target.value = '';
  };
  return (
    <label className={`shot${main ? " shot--main" : ""}${small ? " shot--small" : ""}`}>
      <span className="shot__icon" aria-hidden>{icon}</span>
      <span>{label}</span>
      <input type="file" accept="image/*" capture="environment" onChange={onChange} aria-label={label} />
    </label>
  );
}

export default function Capture() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Product | null>(null);
  const [busy, setBusy] = useState(0);
  const [structure, setStructure] = useState<StructureResult | null>(null);
  const [structuring, setStructuring] = useState(false);
  const [rejected, setRejected] = useState<SuggestionKey[]>([]);
  const [accepted, setAccepted] = useState(false);
  const saved = useRef(false);
  const staged = useRef<string[]>([]);
  const draftRef = useRef<Product | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    let alive = true;
    saved.current = false;
    (async () => {
      const boothId = params.get('booth');
      const src = boothId ? await db.products.get(boothId) : undefined;
      const p = await newCaptureProduct({ sameBoothAs: src });
      if (alive) setDraft(p);
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
  }, [params]);

  const patch = (changes: Partial<Product>) => setDraft((d) => (d ? { ...d, ...changes } : d));

  const speech = useSpeech((text) => setDraft((d) => (d ? { ...d, voiceTranscript: `${d.voiceTranscript} ${text}`.trim() } : d)));

  async function onFile(file: File, kind: PhotoKind) {
    setBusy((b) => b + 1);
    try {
      const photo = await stagePhoto(file, kind, kind === 'info' ? 'business_card' : undefined);
      staged.current.push(photo.id);
      setDraft((d) => (d ? { ...d, photos: [...d.photos, photo] } : d));
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

  async function runStructure(text = draft?.voiceTranscript ?? '') {
    if (!draft || !text.trim()) return;
    setStructuring(true);
    try {
      const productPhoto = draft.photos.find((p) => p.kind === 'product');
      const blob = productPhoto ? (await db.photoBlobs.get(productPhoto.id))?.low : undefined;
      const result = await structureCapture(text, blob);
      setStructure(result);
      setRejected([]);
      setAccepted(false);
    } finally {
      setStructuring(false);
    }
  }

  // Auto-structure when dictation ends (setting, default on).
  const wasListening = useRef(false);
  useEffect(() => {
    if (wasListening.current && !speech.listening) {
      void loadSettings().then((s) => { if (s.autoStructureVoice) void runStructure(); });
    }
    wasListening.current = speech.listening;
  }, [speech.listening]);

  function acceptSuggestion() {
    if (!draft || !structure || accepted) return;
    const keys = suggestionLines(structure.suggestion).map((l) => l.key).filter((k) => !rejected.includes(k));
    setDraft(applySuggestion(draft, structure.suggestion, keys));
    setAccepted(true);
  }

  async function save() {
    if (!draft) return;
    if (speech.listening) speech.stop();
    if (busy > 0) { toast('Photo is still being processed…'); return; }
    try {
      let p = draft;
      if (structure && !accepted) {
        const keys = suggestionLines(structure.suggestion).map((l) => l.key).filter((k) => !rejected.includes(k));
        p = applySuggestion(draft, structure.suggestion, keys);
      }
      if (structure?.source === 'ai') p = { ...p, ai: { ...p.ai, structuredAt: new Date().toISOString() } };
      await attachStagedPhotos(p.id, p.photos.map((ph) => ph.id));
      await saveNewProduct(p);
      saved.current = true;
      navigate(`/captured/${p.id}`, { replace: true });
    } catch (err) {
      toast(errorText(err), { error: true });
    }
  }

  function next() {
    if (step === 1) acceptSuggestion();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  if (!draft) return <div className="page"><p className="muted">Loading…</p></div>;
  const boothSource = params.get('booth');

  return (
    <div className="page page--narrow capture">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => (step ? setStep(step - 1) : navigate(-1))}><Icon name="back" /></button>
        <h1>{STEPS[step]}</h1>
        <span className="mono">{step + 1}/{STEPS.length}</span>
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
          <button type="button" className={`mic${speech.listening ? ' on' : ''}`} aria-pressed={speech.listening}
            aria-label={speech.listening ? 'Stop recording' : 'Start voice note'}
            onClick={() => (speech.listening ? speech.stop() : speech.start())}>
            <Icon name={speech.listening ? 'stop' : 'mic'} />
          </button>
          <p className="interim">{speech.listening ? (speech.interim || 'Listening… speak German or English') : speech.supported ? 'Tap and speak' : 'Use the 🎤 on the keyboard'}</p>
          {speech.error && <p className="error-box">{speech.error}</p>}
          <textarea className="textarea" placeholder={'e.g. "Automatischer Soßenspender, interessant für Babel, ca. 500 Euro, B2B, Deutschland"'}
            value={draft.voiceTranscript} onChange={(e) => patch({ voiceTranscript: e.target.value })} />
          <div className="row">
            <input className="input grow" placeholder="Product name (optional)" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          {!structure && draft.voiceTranscript.trim() && (
            <button type="button" className="btn" disabled={structuring} onClick={() => void runStructure()}>
              <Icon name="sparkle" />{structuring ? 'Reading…' : 'Detect fields'}
            </button>
          )}
          {structuring && structure && <p className="small muted">Reading…</p>}
          {structure && (
            <SuggestionReview suggestion={structure.suggestion} source={structure.source} rejected={rejected} accepted={accepted}
              onToggle={(k) => setRejected((r) => (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]))}
              onAcceptAll={acceptSuggestion} />
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
        {step < STEPS.length - 1 && <button type="button" className="btn btn--big" onClick={() => void save()}>Save</button>}
        {step < STEPS.length - 1
          ? <button type="button" className="btn btn--big btn--primary" onClick={next}>Next<Icon name="next" /></button>
          : <button type="button" className="btn btn--big btn--pink" onClick={() => void save()}>Save product</button>}
      </div>
    </div>
  );
}
