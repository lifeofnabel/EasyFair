import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CategoryPicker, CategoryQuestions } from '../components/CategoryQuestions';
import {
  BusinessTypeEditor, InvestorEditor, MarketEditor, PricingEditor, ProjectsEditor, RegulatoryEditor, SeasonPurposeEditor,
} from '../components/Editors';
import { Icon } from '../components/Icon';
import { PhotoImg, mainPhoto } from '../components/ProductCard';
import { SupplierEditor } from '../components/SupplierEditor';
import { FollowUpCard } from '../components/FollowUpCard';
import { PriorityBadge, RedFlagBanner, SalesChance } from '../components/LeadBadges';
import { RedFlagEditor, StandEditor } from '../components/StandSteps';
import { ChipSelect, Sheet, Stars, errorText, toast } from '../components/ui';
import { PRIORITIES } from '../constants/stand';
import { INFO_TYPES, PHOTO_KINDS, REG_TOPICS, RISK_LEVELS, SCORE_LABELS, labelOf } from '../constants/options';
import { db } from '../db/db';
import { addPhoto, archiveProduct, deleteProductForever, removePhoto, restoreProduct, updateProduct } from '../db/repo';
import { useFairs, useProduct } from '../hooks/useData';
import { AiError, analyzeProduct, pickAiPhotos, scoreProduct } from '../services/ai';
import { categoryIcon, productTitle, shortDate } from '../services/format';
import { SCORE_DIMENSIONS, type Photo, type PhotoKind, type Product } from '../types/models';
import { SupplierInsight } from '../components/SupplierInsight';

const HISTORY_LABEL: Record<string, string> = {
  created: 'Created', edited: 'Edited', ai_structured: 'AI structured', ai_analysis: 'AI analysis generated',
  ai_score: 'AI score generated', archived: 'Archived', restored: 'Restored', photo_added: 'Photo added',
};

/** Local draft + debounced save, so typing stays smooth while every change is persisted. */
function useAutosave(product: Product | null | undefined) {
  const [draft, setDraft] = useState<Product | null>(null);
  const pending = useRef<Partial<Product>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const id = product?.id;

  useEffect(() => {
    if (!product) return;
    // Accept external changes (AI results, sync) unless the user is mid-edit on those fields.
    setDraft((d) => (d && d.id === product.id ? { ...product, ...pending.current } : product));
  }, [product]);

  const flush = () => {
    clearTimeout(timer.current);
    const changes = pending.current;
    pending.current = {};
    if (id && Object.keys(changes).length) void updateProduct(id, changes).catch((e) => toast(errorText(e), { error: true }));
  };

  useEffect(() => () => flush(), [id]);

  const patch = (changes: Partial<Product>) => {
    setDraft((d) => (d ? { ...d, ...changes } : d));
    pending.current = { ...pending.current, ...changes };
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  const discard = () => { clearTimeout(timer.current); pending.current = {}; };
  return { draft, patch, flush, discard };
}

function Gallery({ p }: { p: Product }) {
  const [active, setActive] = useState<string | undefined>();
  const [kind, setKind] = useState<PhotoKind>('product');
  const photo = p.photos.find((ph) => ph.id === active) ?? mainPhoto(p);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    for (const f of files) {
      try {
        const ph = await addPhoto(p.id, f, kind, kind === 'info' ? 'other' : undefined);
        await updateProduct(p.id, (cur) => ({ photos: [...cur.photos, ph] }), 'photo_added');
      } catch (err) { toast(errorText(err), { error: true }); }
    }
  }
  const patchPhoto = (id: string, changes: Partial<Photo>) =>
    void updateProduct(p.id, (cur) => ({ photos: cur.photos.map((x) => (x.id === id ? { ...x, ...changes } : x)) }));

  return (
    <div className="stack">
      <div className="gallery-main">
        {photo
          ? <PhotoImg photo={photo} quality="high" alt={productTitle(p)} />
          : <span>{categoryIcon(p)}</span>}
      </div>
      {photo && (
        <div className="row row--wrap small">
          <select className="select" style={{ width: 'auto', minHeight: 34 }} value={photo.kind}
            onChange={(e) => patchPhoto(photo.id, { kind: e.target.value as PhotoKind })}>
            {PHOTO_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          {photo.kind === 'info' && (
            <select className="select" style={{ width: 'auto', minHeight: 34 }} value={photo.infoType ?? 'other'}
              onChange={(e) => patchPhoto(photo.id, { infoType: e.target.value as Photo['infoType'] })}>
              {INFO_TYPES.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          )}
          <span className="muted grow">{photo.uploadState === 'uploaded' ? '☁︎ uploaded' : 'on device'}{photo.aiUsedAt ? ' · used by AI' : ''}</span>
          <button type="button" className="btn btn--small btn--quiet btn--danger"
            onClick={() => { if (confirm('Remove this photo?')) void removePhoto(p.id, photo.id); }}>Remove</button>
        </div>
      )}
      <div className="photo-strip">
        {p.photos.map((ph) => (
          <button key={ph.id} type="button" className="photo-tile" style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', outline: ph.id === photo?.id ? '2px solid var(--pink)' : undefined, borderRadius: 8 }}
            onClick={() => setActive(ph.id)}>
            <PhotoImg photo={ph} />
            <div className="photo-tile__label">{ph.kind === 'info' ? labelOf(INFO_TYPES, ph.infoType ?? 'other') : ph.kind}</div>
          </button>
        ))}
      </div>
      <div className="row">
        <select className="select" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as PhotoKind)} aria-label="Photo type">
          {PHOTO_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <label className="btn grow" style={{ position: 'relative' }}>
          <Icon name="camera" />Add photo
          <input type="file" accept="image/*" multiple onChange={onFile} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
        </label>
      </div>
    </div>
  );
}

function AiAnalysisCard({ p }: { p: Product }) {
  const [busy, setBusy] = useState(false);
  const a = p.ai.analysis;
  const { product: pp, info } = pickAiPhotos(p.photos);
  async function run(force: boolean) {
    setBusy(true);
    try { await analyzeProduct(p, force); toast('AI analysis ready.'); }
    catch (err) { toast(err instanceof AiError ? err.message : errorText(err), { error: true }); }
    finally { setBusy(false); }
  }
  const hintDiffers = a?.regulatoryHint && (a.regulatoryHint.risk !== p.regulatory.risk
    || a.regulatoryHint.topics.some((t) => !p.regulatory.topics.includes(t)));
  return (
    <div className="card stack">
      <div className="row row--between"><h3>AI analysis</h3>{a && <span className="ai-tag">AI · {a.provider}</span>}</div>
      {!a && <p className="small muted">Uses {[pp && 'the product photo', info && 'one info photo', 'your data'].filter(Boolean).join(', ')} in low quality. Booth photos are never sent.</p>}
      {a && (
        <>
          <p className="ai-summary">{a.summary}</p>
          <div className="pro-con">
            <div className="pro-con__col pro-con__col--pro">
              <span className="pro-con__head">👍 Advantages</span>
              <ul>{a.advantages.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className="pro-con__col pro-con__col--con">
              <span className="pro-con__head">⚠️ Disadvantages</span>
              <ul>{a.disadvantages.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
          <div className="questions">
            <span className="mono">Questions to ask yourself</span>
            <ol>{a.questions.map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
          {hintDiffers && a.regulatoryHint && (
            <div className="hint-box row row--between row--wrap">
              <span>AI regulatory hint: {labelOf(RISK_LEVELS, a.regulatoryHint.risk)} · {a.regulatoryHint.topics.map((t) => labelOf(REG_TOPICS, t)).join(', ') || 'no topics'}</span>
              <button type="button" className="btn btn--small" onClick={() => void updateProduct(p.id, (cur) => ({
                regulatory: { ...cur.regulatory, risk: a.regulatoryHint!.risk, topics: [...new Set([...cur.regulatory.topics, ...a.regulatoryHint!.topics])] },
              }))}>Apply</button>
            </div>
          )}
          <p className="small muted">Generated {shortDate(a.at)}. AI output, may be wrong. Not legal advice.</p>
        </>
      )}
      <button type="button" className={`btn ${a ? '' : 'btn--primary'}`} disabled={busy} onClick={() => void run(Boolean(a))}>
        <Icon name="sparkle" />{busy ? 'Analysing…' : a ? 'Run again' : 'Start AI analysis'}
      </button>
    </div>
  );
}

function ScoreCard({ p }: { p: Product }) {
  const [busy, setBusy] = useState(false);
  const s = p.ai.score;
  async function run(force: boolean) {
    setBusy(true);
    try { await scoreProduct(p, force); toast('Product score ready.'); }
    catch (err) { toast(err instanceof AiError ? err.message : errorText(err), { error: true }); }
    finally { setBusy(false); }
  }
  return (
    <div className="card stack">
      <div className="row row--between"><h3>Product score</h3>{s && <span className="ai-tag">AI estimate</span>}</div>
      {s ? (
        <>
          <div className="score-head">
            <div className={`ring ring--${s.total >= 70 ? 'good' : s.total >= 45 ? 'mid' : 'low'}`} style={{ ['--pct' as string]: s.total }} role="img" aria-label={`Score ${s.total} of 100`}>
              <span className="ring__num">{s.total}</span><span className="ring__of">/100</span>
            </div>
            <p className="small score-head__why"><strong>Why?</strong> {s.why}</p>
          </div>
          <div className="stack" style={{ gap: 9 }}>
            {SCORE_DIMENSIONS.map((d) => (
              <div key={d} className="stack" style={{ gap: 3 }}>
                <div className="row row--between small"><span>{SCORE_LABELS[d]}</span><span className="muted">{s.dims[d]}/10</span></div>
                <div className={`bar bar--${s.dims[d] >= 7 ? 'good' : s.dims[d] >= 4 ? 'mid' : 'low'}`}><span style={{ width: `${s.dims[d] * 10}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="small muted">10 = favourable for you (e.g. little competition). AI estimate, not an objective market analysis.</p>
        </>
      ) : <p className="small muted">Rates demand, competition, margin, capital, scalability, regulation, import, private label and personal fit.</p>}
      <button type="button" className={`btn ${s ? '' : 'btn--primary'}`} disabled={busy} onClick={() => void run(Boolean(s))}>
        <Icon name="sparkle" />{busy ? 'Scoring…' : s ? 'Score again' : 'Generate score'}
      </button>
    </div>
  );
}

function ReviewBar({ id }: { id: string }) {
  const navigate = useNavigate();
  const queue = useLiveQuery(() => db.products.filter((p) => !p.archivedAt && p.needsReview).sortBy('createdAt'), []) ?? [];
  const idx = queue.findIndex((p) => p.id === id);
  const next = queue.find((p, i) => i > idx && p.id !== id) ?? queue.find((p) => p.id !== id);
  return (
    <div className="card card--pink row row--between row--wrap">
      <span className="small"><strong>Review mode</strong> · {queue.length} open</span>
      <div className="row">
        <button type="button" className="btn btn--small" onClick={async () => {
          await updateProduct(id, { needsReview: false });
          navigate(next ? `/product/${next.id}?review=1` : '/review', { replace: true });
        }}>✓ Reviewed, next</button>
        {next && <Link className="btn btn--small btn--quiet" replace to={`/product/${next.id}?review=1`}>Skip</Link>}
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const product = useProduct(id);
  const fairs = useFairs();
  const { draft: p, patch, flush, discard } = useAutosave(product);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (product === null) return <div className="page"><div className="empty">Product not found.<Link className="btn" to="/products">All products</Link></div></div>;
  if (!p) return null;

  const archived = Boolean(p.archivedAt);

  return (
    <div className="page">
      <div className="topbar no-print">
        <button type="button" className="icon-btn" aria-label="Back" onClick={() => { flush(); navigate(-1); }}><Icon name="back" /></button>
        <div className="row">
          <Link className="btn btn--small" to={`/pdf/${p.id}`} onClick={flush}><Icon name="pdf" />PDF</Link>
          {archived
            ? <button type="button" className="btn btn--small" onClick={() => void restoreProduct(p.id).then(() => toast('Restored.'))}>Restore</button>
            : <button type="button" className="btn btn--small btn--quiet" onClick={() => { flush(); void archiveProduct(p.id).then(() => { toast('Archived. Find it under Filters → Show archived.'); navigate('/products'); }); }}><Icon name="archive" />Archive</button>}
          <button type="button" className="icon-btn icon-btn--danger" aria-label="Delete permanently" onClick={() => setConfirmDelete(true)}><Icon name="trash" /></button>
        </div>
      </div>
      {params.has('review') && <ReviewBar id={p.id} />}
      {archived && <div className="hint-box">This product is archived. It is hidden from lists until restored.</div>}
      <RedFlagBanner p={p} />

      <div className="detail">
        <aside className="detail__aside stack">
          <Gallery p={p} />
          <div className="card stack">
            <div className="row row--between">
              <span className="field__label">Priority <PriorityBadge priority={p.priority} /></span>
              <SalesChance p={p} />
            </div>
            <ChipSelect big options={PRIORITIES} value={p.priority} onChange={(priority) => patch({ priority })} />
            <div className="row row--between">
              <span className="field__label">Interest</span>
              <Stars value={p.interest} onChange={(interest) => patch({ interest })} />
            </div>
            <label className="row small"><input type="checkbox" checked={p.needsReview} onChange={(e) => patch({ needsReview: e.target.checked })} />Review later</label>
            <div className="grid-2">
              <select className="select" value={p.fairId ?? ''} onChange={(e) => patch({ fairId: e.target.value || null })} aria-label="Fair">
                <option value="">No fair</option>
                {fairs?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input className="input" placeholder="Hall" value={p.hall} onChange={(e) => patch({ hall: e.target.value })} />
            </div>
          </div>
          <div className="history" aria-label="Change history">
            {[...p.history].reverse().slice(0, 6).map((h) => <span key={h.at + h.action}>{HISTORY_LABEL[h.action] ?? h.action} {shortDate(h.at)}</span>)}
          </div>
        </aside>

        <div className="stack--lg">
          <div className="stack">
            <input className="input" style={{ fontSize: '1.3rem', fontWeight: 600 }} placeholder="Product name" value={p.name}
              onChange={(e) => patch({ name: e.target.value })} />
            <input className="input" placeholder="Company" autoCapitalize="words" value={p.supplier.company}
              onChange={(e) => patch({ supplier: { ...p.supplier, company: e.target.value } })} aria-label="Company" />
            <textarea className="textarea" placeholder="Description" value={p.description} onChange={(e) => patch({ description: e.target.value })} />
            <textarea className="textarea" placeholder="My note" value={p.notes} onChange={(e) => patch({ notes: e.target.value })} />
            {p.voiceTranscript && (
              <details className="card">
                <summary>Voice note</summary>
                <textarea className="textarea" value={p.voiceTranscript} onChange={(e) => patch({ voiceTranscript: e.target.value })} />
              </details>
            )}
          </div>

          <div className="card stack">
            <h3>Basics</h3>
            <MarketEditor p={p} onPatch={patch} />
            <BusinessTypeEditor p={p} onPatch={patch} />
            <div className="field"><span className="field__label">Category</span>
              <CategoryPicker value={p.categoryId} onChange={(categoryId) => patch({ categoryId, categoryAnswers: {} })} /></div>
            <CategoryQuestions categoryId={p.categoryId} answers={p.categoryAnswers} onChange={(categoryAnswers) => patch({ categoryAnswers })} />
            <ProjectsEditor p={p} onPatch={patch} />
            <SeasonPurposeEditor p={p} onPatch={patch} />
          </div>

          <details className="card" open={params.has('review') || undefined}>
            <summary>Supplier {p.supplier.company ? `· ${p.supplier.company}` : ''}</summary>
            <div className="stack">
              {p.supplier.company && <SupplierInsight company={p.supplier.company} />}
              <SupplierEditor supplier={p.supplier} onChange={(supplier) => patch({ supplier })} photos={p.photos}
                onPhotoPatch={(pid, changes) => patch({ photos: p.photos.map((x) => (x.id === pid ? { ...x, ...changes } : x)) })} />
            </div>
          </details>

          <details className="card">
            <summary>Stand talk {p.stand.deDistributor === 'no' ? '· 🚀' : ''}</summary>
            <StandEditor p={p} patch={patch} />
          </details>
          <details className="card">
            <summary>Red flags {p.redFlags.length ? `· 🚩 ${p.redFlags.length}` : ''}</summary>
            <RedFlagEditor value={p.redFlags} onChange={(redFlags) => patch({ redFlags })} />
          </details>
          <details className="card">
            <summary>Follow-up {p.followUpSentAt ? '· ✓ sent' : ''}</summary>
            <FollowUpCard key={`${p.supplier.company}|${p.supplier.contactPerson}|${p.hall}|${p.supplier.boothNumber}`} p={p} link={false} />
          </details>
          <details className="card"><summary>Pricing & business</summary><PricingEditor p={p} onPatch={patch} /></details>
          <details className="card"><summary>Investors</summary><InvestorEditor p={p} onPatch={patch} /></details>
          <details className="card" open={params.has('review') || undefined}>
            <summary>Regulatory risk · {RISK_LEVELS.find((r) => r.id === p.regulatory.risk)?.icon}</summary>
            <RegulatoryEditor p={p} onPatch={patch} />
          </details>

          <div className="grid-ai stack">
            <AiAnalysisCard p={p} />
            <ScoreCard p={p} />
          </div>
        </div>
      </div>

      {confirmDelete && (
        <Sheet title="Delete this product?" onClose={() => !deleting && setConfirmDelete(false)}>
          <div className="stack">
            <p><strong>{productTitle(p)}</strong> will be deleted from this phone and from your database. This cannot be undone.</p>
            <p className="small muted">Photos already uploaded stay in Cloudinary (the app cannot delete them). Want to hide it instead? Use Archive.</p>
            <button type="button" className="btn btn--danger-solid btn--big" disabled={deleting} onClick={async () => {
              setDeleting(true);
              discard();
              try {
                await deleteProductForever(p.id);
                toast('Product deleted.');
                navigate('/products', { replace: true });
              } catch (err) { toast(errorText(err), { error: true }); setDeleting(false); }
            }}>{deleting ? 'Deleting…' : 'Delete permanently'}</button>
            <button type="button" className="btn btn--big" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep it</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}


