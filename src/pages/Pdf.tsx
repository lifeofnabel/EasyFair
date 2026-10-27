import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon, Logo } from '../components/Icon';
import { PhotoImg, mainPhoto } from '../components/ProductCard';
import { toast } from '../components/ui';
import { answerLabel, productType, visibleQuestions } from '../constants/categories';
import {
  BUSINESS_TYPES, INVESTMENT_TYPES, INVESTORS, PURPOSES, READINESS, REG_TOPICS, RISK_LEVELS, SCORE_LABELS, SEASONS, labelOf,
} from '../constants/options';
import { useFairs, useProduct } from '../hooks/useData';
import { categoryIcon, categoryLabel, fairName, marketsLabel, productTitle, projectsLabel } from '../services/format';
import { dealRows } from '../services/deal';
import { elementToPdf, shareOrDownload } from '../services/pdf';
import { SCORE_DIMENSIONS, type Fair, type Product } from '../types/models';

const join = (xs: string[]) => xs.filter(Boolean).join(', ') || '–';
/** One page means long texts are shortened. The full text stays in the app. */
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** One A4 page with the facts that matter for a decision. Also used as the hidden capture copy. */
function ProductPage({ p, fairs }: { p: Product; fairs?: Fair[] }) {
  const a = p.ai.analysis;
  const s = p.ai.score;
  const sup = p.supplier;
  const details = visibleQuestions(p.categoryId, p.categoryAnswers).filter((q) => p.categoryAnswers[q.id] !== undefined);
  const investors = p.investors.map((i) => {
    const inv = INVESTORS.find((x) => x.id === i.investorId);
    return [inv?.label, inv?.maxAmount ? `≤ €${inv.maxAmount.toLocaleString('en-GB')}` : '', labelOf(INVESTMENT_TYPES, i.type), labelOf(READINESS, i.readiness)].filter(Boolean).join(' ');
  });
  const type = productType(p.categoryId, p.categoryAnswers);
  return (
    <section className="ppage">
      <div className="ppage__head">
        <span className="ppage__brand"><Logo />EasyFair</span>
        <span className="ppage__brand">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>

      <div>
        <h2>{categoryLabel(p)}{type ? ` · ${type}` : ''}</h2>
        <h1>{productTitle(p)}</h1>
        {(p.priority || p.stand.deDistributor === 'no') && (
          <p className="ppage__badges">
            {p.priority && <span className="ppage__prio">Priority {p.priority}</span>}
            {p.stand.deDistributor === 'no' && <span className="ppage__sales">SALES CHANCE · no DE distributor</span>}
          </p>
        )}
        {p.description && <p className="ppage__desc">{clip(p.description, 230)}</p>}
      </div>

      <div className="ppage__top">
        <div className="ppage__img"><PhotoImg photo={mainPhoto(p)} quality="high" fallback={categoryIcon(p)} eager /></div>
        <dl className="kv">
          <dt>Target market</dt><dd>{marketsLabel(p) || '–'}</dd>
          <dt>Business type</dt><dd>{labelOf(BUSINESS_TYPES, p.businessType) || '–'}</dd>
          <dt>Project</dt><dd>{projectsLabel(p) || '–'}</dd>
          <dt>Goal</dt><dd>{join(p.purposes.map((x) => labelOf(PURPOSES, x)))}</dd>
          <dt>Season</dt><dd>{join(p.seasons.map((x) => labelOf(SEASONS, x)))}</dd>
          <dt>Investor</dt><dd>{join(investors)}</dd>
          <dt>Interest</dt><dd>{p.interest ? '★'.repeat(p.interest) + '☆'.repeat(5 - p.interest) : '–'}</dd>
          <dt>Fair</dt><dd>{[fairName(fairs, p.fairId), p.hall && `Hall ${p.hall}`, sup.boothNumber && `Booth ${sup.boothNumber}`].filter(Boolean).join(' · ') || '–'}</dd>
        </dl>
      </div>

      <div className="ppage__cols">
        <div className="pbox">
          <h2>Supplier & contact</h2>
          <dl className="kv">
            <dt>Company</dt><dd>{sup.company || '–'}</dd>
            <dt>Contact</dt><dd>{[sup.contactPerson, sup.position].filter(Boolean).join(', ') || '–'}</dd>
            <dt>Phone</dt><dd>{[sup.phone, sup.whatsapp && `WhatsApp ${sup.whatsapp}`].filter(Boolean).join(' · ') || '–'}</dd>
            <dt>WeChat</dt><dd>{sup.wechat || '–'}</dd>
            <dt>Email</dt><dd style={{ overflowWrap: 'anywhere' }}>{sup.email || '–'}</dd>
            <dt>Website</dt><dd style={{ overflowWrap: 'anywhere' }}>{sup.website || '–'}</dd>
          </dl>
        </div>
        <div className="pbox">
          <h2>Deal terms</h2>
          <dl className="kv">
            {dealRows(p).slice(0, 9).map(([k, v]) => (<><dt key={`k-${k}`}>{k}</dt><dd key={`v-${k}`}>{v}</dd></>))}
          </dl>
        </div>
      </div>

      <div className="ppage__cols ppage__cols--ai">
        <div className="pbox">
          <h2>AI analysis {a ? '' : '· not generated'}</h2>
          {a ? (
            <div className="stack" style={{ gap: '1.5mm' }}>
              <p>{clip(a.summary, 200)}</p>
              <div className="ppage__cols">
                <div><strong>Advantages</strong><ul>{a.advantages.map((x) => <li key={x}>{clip(x, 90)}</li>)}</ul></div>
                <div><strong>Disadvantages</strong><ul>{a.disadvantages.map((x) => <li key={x}>{clip(x, 90)}</li>)}</ul></div>
              </div>
              <div><strong>Questions to ask yourself</strong><ul>{a.questions.slice(0, 3).map((x) => <li key={x}>{clip(x, 110)}</li>)}</ul></div>
            </div>
          ) : <p>–</p>}
        </div>
        <div className="pbox">
          <h2>Score & risk</h2>
          {s ? (
            <>
              <div className="score"><span className="score__big">{s.total}</span><span>/100</span></div>
              <p style={{ fontSize: '7pt' }}>{SCORE_DIMENSIONS.map((d) => `${SCORE_LABELS[d]} ${s.dims[d]}`).join(' · ')}</p>
            </>
          ) : <p>Score: –</p>}
          <p style={{ marginTop: '1.5mm' }}>
            Regulatory risk: <strong>{labelOf(RISK_LEVELS, p.regulatory.risk)} {RISK_LEVELS.find((r) => r.id === p.regulatory.risk)?.icon}</strong>
            {p.regulatory.topics.length > 0 && <> · {p.regulatory.topics.map((t) => labelOf(REG_TOPICS, t)).join(', ')}</>}
          </p>
          <p style={{ fontSize: '6.5pt', color: '#6D6776' }}>AI estimate and orientation only, not legal advice.</p>
        </div>
      </div>

      {(p.notes || details.length > 0) && (
        <div className="pbox">
          <h2>My note & details</h2>
          {p.notes && <p>{clip(p.notes, 220)}</p>}
          {details.length > 0 && <p style={{ fontSize: '7.5pt' }}>{clip(details.map((q) => `${q.label}: ${answerLabel(q, p.categoryAnswers[q.id])}`).join(' · '), 240)}</p>}
        </div>
      )}
      <div className="ppage__foot"><span>Captured {new Date(p.createdAt).toLocaleDateString('en-GB')}</span><span>jajehelp.com/messe</span></div>
    </section>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'product';

export default function Pdf() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useProduct(id);
  const fairs = useFairs();
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(() => Math.min(1, (window.innerWidth - 24) / 794));
  useEffect(() => {
    const onResize = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (product === null) return <div className="page"><div className="empty">Product not found.<Link className="btn" to="/products">All products</Link></div></div>;
  if (!product) return <div className="page"><div className="skeleton" style={{ height: 300 }} /></div>;

  async function create() {
    const el = captureRef.current?.querySelector<HTMLElement>('.ppage');
    if (!el || !product) return;
    setBusy(true);
    try {
      // Let photos finish decoding before taking the picture of the page.
      const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      await Promise.race([
        Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => {})))),
        wait(5000),
      ]);
      const blob = await elementToPdf(el);
      const how = await shareOrDownload(blob, `EasyFair-${slug(productTitle(product))}.pdf`, productTitle(product));
      toast(how === 'downloaded' ? 'PDF saved to your downloads.' : 'PDF ready.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create the PDF.', { error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pdf-screen">
      <div className="print-toolbar no-print row row--between" data-no-translate>
        <button type="button" className="btn btn--small" onClick={() => navigate(-1)}><Icon name="back" />Back</button>
        <div className="row">
          <button type="button" className="btn btn--small" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn btn--small btn--pink" disabled={busy} onClick={() => void create()}><Icon name="pdf" />{busy ? 'Creating…' : 'Create PDF'}</button>
        </div>
      </div>
      <p className="no-print small muted pdf-hint">One page with the most important data. “Create PDF” opens the share sheet: Save to Files, WhatsApp, AirDrop.</p>
      <div className="print-pages" data-no-translate style={{ zoom }}><ProductPage p={product} fairs={fairs} /></div>
      <div className="pdf-capture" ref={captureRef} aria-hidden data-no-translate><ProductPage p={product} fairs={fairs} /></div>
    </div>
  );
}
