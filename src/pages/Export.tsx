import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FilterPanel } from '../components/FilterPanel';
import { Icon, Logo } from '../components/Icon';
import { PhotoImg, mainPhoto } from '../components/ProductCard';
import { ChipSelect } from '../components/ui';
import { CATEGORIES, CATEGORY_MAP, productType, visibleQuestions, answerLabel } from '../constants/categories';
import {
  BUSINESS_TYPES, INVESTMENT_TYPES, INVESTORS, PURPOSES, READINESS, REG_TOPICS, RISK_LEVELS, SCORE_LABELS, SEASONS, labelOf,
} from '../constants/options';
import { useFairs, useProducts } from '../hooks/useData';
import { filterProducts, filterToParams, paramsToFilter, type ProductFilter } from '../services/filter';
import { categoryIcon, categoryLabel, fairName, marketsLabel, money, productTitle, projectsLabel } from '../services/format';
import { SCORE_DIMENSIONS, type Fair, type Product } from '../types/models';

const join = (xs: string[]) => xs.filter(Boolean).join(', ') || '–';

function Brand({ right }: { right: string }) {
  return (
    <div className="ppage__head">
      <span className="ppage__brand"><Logo />Jajehelp · Messe Organizer</span>
      <span className="ppage__brand">{right}</span>
    </div>
  );
}

function ProductPage({ p, fairs, n, total }: { p: Product; fairs?: Fair[]; n: number; total: number }) {
  const a = p.ai.analysis;
  const s = p.ai.score;
  const sup = p.supplier;
  const details = visibleQuestions(p.categoryId, p.categoryAnswers).filter((q) => p.categoryAnswers[q.id] !== undefined);
  const investors = p.investors.map((i) => {
    const inv = INVESTORS.find((x) => x.id === i.investorId);
    return [inv?.label, inv?.maxAmount ? `≤ €${inv.maxAmount.toLocaleString('en-GB')}` : '', labelOf(INVESTMENT_TYPES, i.type), labelOf(READINESS, i.readiness)].filter(Boolean).join(' ');
  });
  return (
    <section className="ppage">
      <Brand right={`${n} / ${total}`} />
      <div className="ppage__top">
        <div className="ppage__img"><PhotoImg photo={mainPhoto(p)} quality="high" fallback={categoryIcon(p)} /></div>
        <div className="stack" style={{ gap: '3mm' }}>
          <div>
            <h2>{categoryLabel(p)}{productType(p.categoryId, p.categoryAnswers) ? ` · ${productType(p.categoryId, p.categoryAnswers)}` : ''}</h2>
            <h1>{productTitle(p)}</h1>
          </div>
          <dl className="kv">
            <dt>Target market</dt><dd>{marketsLabel(p) || '–'}</dd>
            <dt>Business type</dt><dd>{labelOf(BUSINESS_TYPES, p.businessType) || '–'}</dd>
            <dt>Season</dt><dd>{join(p.seasons.map((x) => labelOf(SEASONS, x)))}</dd>
            <dt>Goal</dt><dd>{join(p.purposes.map((x) => labelOf(PURPOSES, x)))}</dd>
            <dt>Project</dt><dd>{projectsLabel(p) || '–'}</dd>
            <dt>Investor</dt><dd>{join(investors)}</dd>
            <dt>Interest</dt><dd>{p.interest ? '★'.repeat(p.interest) + '☆'.repeat(5 - p.interest) : '–'}</dd>
            <dt>Fair</dt><dd>{[fairName(fairs, p.fairId), p.hall && `Hall ${p.hall}`, sup.boothNumber && `Booth ${sup.boothNumber}`].filter(Boolean).join(' · ') || '–'}</dd>
          </dl>
        </div>
      </div>

      <div className="ppage__cols">
        <div className="pbox">
          <h2>Supplier & contact</h2>
          <dl className="kv">
            <dt>Company</dt><dd>{sup.company || '–'}</dd>
            <dt>Contact</dt><dd>{[sup.contactPerson, sup.position].filter(Boolean).join(', ') || '–'}</dd>
            <dt>Phone / WhatsApp</dt><dd>{[sup.phone, sup.whatsapp].filter(Boolean).join(' · ') || '–'}</dd>
            <dt>WeChat</dt><dd>{sup.wechat || '–'}</dd>
            <dt>Email</dt><dd>{sup.email || '–'}</dd>
            <dt>Website</dt><dd style={{ overflowWrap: 'anywhere' }}>{sup.website || '–'}</dd>
          </dl>
        </div>
        <div className="pbox">
          <h2>Prices</h2>
          <dl className="kv">
            <dt>Supplier price</dt><dd>{money(p.pricing.supplierPrice, p.pricing.currency)}</dd>
            <dt>MOQ</dt><dd>{p.pricing.moq ?? 'Unknown'}</dd>
            <dt>Target price</dt><dd>{money(p.pricing.targetSellingPrice, p.pricing.currency)}</dd>
            <dt>Margin</dt><dd>{p.pricing.estimatedMargin !== undefined ? `${p.pricing.estimatedMargin}%` : 'Unknown'}</dd>
            <dt>Startup capital</dt><dd>{money(p.pricing.startupCapital, 'EUR')}</dd>
            <dt>OEM</dt><dd>{p.oem === null ? 'Unknown' : p.oem ? 'Yes' : 'No'}</dd>
          </dl>
          {p.pricing.note && <p style={{ marginTop: '2mm' }}>{p.pricing.note}</p>}
        </div>
      </div>

      <div className="pbox">
        <h2>AI analysis {a ? '' : '· not generated'}</h2>
        {a ? (
          <div className="stack" style={{ gap: '2mm' }}>
            <p>{a.summary}</p>
            <div className="ppage__cols">
              <div><strong>Advantages</strong><ul>{a.advantages.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><strong>Disadvantages</strong><ul>{a.disadvantages.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <div><strong>Questions</strong><ul>{a.questions.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        ) : <p>–</p>}
      </div>

      <div className="ppage__cols">
        <div className="pbox">
          <h2>Regulatory risk</h2>
          <p>{labelOf(RISK_LEVELS, p.regulatory.risk)} {RISK_LEVELS.find((r) => r.id === p.regulatory.risk)?.icon}</p>
          <p>{join(p.regulatory.topics.map((t) => labelOf(REG_TOPICS, t)))}</p>
          {p.regulatory.note && <p>{p.regulatory.note}</p>}
          <p style={{ fontSize: '7pt', color: '#6D6776', marginTop: '1mm' }}>Orientation only, not legal advice.</p>
        </div>
        <div className="pbox">
          <h2>Product score</h2>
          {s ? (
            <>
              <div className="score"><span className="score__big">{s.total}</span><span>/100</span></div>
              <p style={{ fontSize: '7.5pt' }}>{SCORE_DIMENSIONS.map((d) => `${SCORE_LABELS[d]} ${s.dims[d]}`).join(' · ')}</p>
              <p style={{ fontSize: '7.5pt', color: '#6D6776' }}>AI estimate, not a market analysis.</p>
            </>
          ) : <p>–</p>}
        </div>
      </div>

      {(p.notes || details.length > 0) && (
        <div className="pbox">
          <h2>My note & details</h2>
          {p.notes && <p>{p.notes}</p>}
          {details.length > 0 && <p style={{ fontSize: '8pt' }}>{details.map((q) => `${q.label}: ${answerLabel(q, p.categoryAnswers[q.id])}`).join(' · ')}</p>}
        </div>
      )}
      <div className="ppage__foot"><span>Created {new Date(p.createdAt).toLocaleDateString('en-GB')}</span><span>jajehelp.com</span></div>
    </section>
  );
}

function describe(f: ProductFilter, fairs?: Fair[]): string {
  const parts: string[] = [];
  if (f.categoryId) parts.push(CATEGORY_MAP[f.categoryId].label);
  if (f.type && f.categoryId) {
    const cat = CATEGORY_MAP[f.categoryId];
    parts.push(cat.questions.find((q) => q.id === cat.typeQuestionId)?.options?.find((o) => o.id === f.type)?.label ?? f.type);
  }
  if (f.project) parts.push(`Project ${f.project}`);
  if (f.market) parts.push(`Market ${f.market}`);
  if (f.minInterest) parts.push(`Interest ${f.minInterest}+`);
  if (f.fairId) parts.push(fairName(fairs, f.fairId));
  return parts.join(' · ') || 'All products';
}

export default function Export() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const products = useProducts();
  const fairs = useFairs();
  const ids = params.get('ids')?.split(',').filter(Boolean) ?? [];
  const filter = useMemo(() => paramsToFilter(params), [params]);
  const [layout, setLayout] = useState<'single' | 'grouped'>('single');
  const [preview, setPreview] = useState(ids.length > 0);
  const idsKey = ids.join(',');
  useEffect(() => { setPreview(idsKey.length > 0); }, [idsKey]);

  const selected = useMemo(() => {
    const all = products ?? [];
    const list = ids.length ? all.filter((p) => ids.includes(p.id)) : filterProducts(all, filter);
    if (layout !== 'grouped') return list;
    const order = CATEGORIES.map((c) => c.id as string);
    return [...list].sort((a, b) => order.indexOf(a.categoryId ?? 'zz') - order.indexOf(b.categoryId ?? 'zz'));
  }, [products, filter, ids.join(','), layout]);

  const pages: React.ReactNode[] = [];
  if (!ids.length || selected.length > 1) {
    pages.push(
      <section key="cover" className="ppage ppage--section">
        <span className="ppage__brand" style={{ fontSize: '9pt' }}><Logo />Jajehelp · Messe Organizer</span>
        <h1 style={{ fontSize: '30pt' }}>Product report</h1>
        <p style={{ fontSize: '12pt' }}>{describe(filter, fairs)}</p>
        <p>{selected.length} products · {new Date().toLocaleDateString('en-GB')}</p>
      </section>,
    );
  }
  let lastCat: string | null | undefined;
  selected.forEach((p, i) => {
    if (layout === 'grouped' && p.categoryId !== lastCat) {
      lastCat = p.categoryId;
      const count = selected.filter((x) => x.categoryId === p.categoryId).length;
      pages.push(
        <section key={`sec-${p.categoryId}`} className="ppage ppage--section">
          <h2>Category</h2>
          <h1 style={{ fontSize: '28pt' }}>{categoryIcon(p)} {categoryLabel(p)}</h1>
          <p>{count} product{count > 1 ? 's' : ''}</p>
        </section>,
      );
    }
    pages.push(<ProductPage key={p.id} p={p} fairs={fairs} n={i + 1} total={selected.length} />);
  });

  if (!preview) {
    return (
      <div className="page page--narrow">
        <div className="topbar"><button type="button" className="icon-btn" aria-label="Back" onClick={() => navigate(-1)}><Icon name="back" /></button><h1>PDF export</h1><span /></div>
        <FilterPanel compact value={filter} onChange={(f) => setParams(filterToParams(f), { replace: true })} fairs={fairs} />
        <div className="field">
          <span className="field__label">Layout</span>
          <ChipSelect allowEmpty={false} options={[{ id: 'single', label: 'One page per product' }, { id: 'grouped', label: 'Grouped by category' }]}
            value={layout} onChange={(v) => setLayout((v ?? 'single') as 'single' | 'grouped')} />
        </div>
        <div className="sticky-actions">
          <button type="button" className="btn btn--big btn--pink" disabled={!selected.length} onClick={() => setPreview(true)}>
            <Icon name="pdf" />Generate PDF ({selected.length})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="print-toolbar no-print card row row--between" style={{ borderRadius: 0 }}>
        <button type="button" className="btn btn--small" onClick={() => (ids.length ? navigate(-1) : setPreview(false))}><Icon name="back" />Back</button>
        <span className="small muted">{selected.length} product{selected.length > 1 ? 's' : ''}</span>
        <button type="button" className="btn btn--small btn--pink" onClick={() => window.print()}><Icon name="pdf" />Save as PDF</button>
      </div>
      <p className="no-print small muted" style={{ textAlign: 'center', padding: '8px 16px 0' }}>
        iPhone: Save as PDF → Share → Save to Files. Desktop: choose "Save as PDF" as printer.
      </p>
      <div className="print-pages">{pages}</div>
      {!selected.length && <div className="empty">Nothing selected. <Link to="/products">Products</Link></div>}
    </div>
  );
}
