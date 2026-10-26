import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilterPanel } from '../components/FilterPanel';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Sheet, errorText, toast } from '../components/ui';
import { useFairs, useProducts } from '../hooks/useData';
import { csvBlob, jsonBlob } from '../services/export';
import {
  EMPTY_FILTER, activeFilterCount, filterProducts, filterToParams, paramsToFilter, type ProductFilter,
} from '../services/filter';
import { localDate } from '../services/followup';
import { shareOrDownload } from '../services/pdf';

interface Quick {
  id: string;
  label: string;
  on: (f: ProductFilter) => boolean;
  toggle: (f: ProductFilter) => ProductFilter;
}

const today = () => localDate(new Date());

/** One-tap filters for the fair floor. They combine with search and the full filter sheet. */
const QUICK: Quick[] = [
  { id: 'all', label: 'All', on: (f) => activeFilterCount(f) === 0, toggle: (f) => ({ ...EMPTY_FILTER, q: f.q }) },
  { id: 'A', label: 'A', on: (f) => f.priority === 'A', toggle: (f) => ({ ...f, priority: f.priority === 'A' ? null : 'A' }) },
  { id: 'B', label: 'B', on: (f) => f.priority === 'B', toggle: (f) => ({ ...f, priority: f.priority === 'B' ? null : 'B' }) },
  { id: 'C', label: 'C', on: (f) => f.priority === 'C', toggle: (f) => ({ ...f, priority: f.priority === 'C' ? null : 'C' }) },
  { id: 'today', label: 'Today', on: (f) => f.day === today(), toggle: (f) => ({ ...f, day: f.day === today() ? null : today() }) },
  { id: 'open', label: 'Follow-up', on: (f) => f.followUp === 'open', toggle: (f) => ({ ...f, followUp: f.followUp === 'open' ? null : 'open' }) },
  { id: 'sales', label: '🚀 Sales', on: (f) => f.salesChance, toggle: (f) => ({ ...f, salesChance: !f.salesChance }) },
  { id: 'flag', label: '🚩', on: (f) => f.redFlags, toggle: (f) => ({ ...f, redFlags: !f.redFlags }) },
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const filter = useMemo(() => paramsToFilter(params), [params]);
  const products = useProducts();
  const fairs = useFairs();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const setFilter = (f: ProductFilter) => setParams(filterToParams(f), { replace: true });
  const list = useMemo(() => filterProducts(products ?? [], filter), [products, filter]);
  const n = activeFilterCount(filter);

  async function exportAs(kind: 'csv' | 'json') {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = kind === 'csv' ? csvBlob(list, fairs ?? []) : jsonBlob(list);
      const how = await shareOrDownload(blob, `easyfair-leads-${stamp}.${kind}`, 'EasyFair leads');
      toast(how === 'downloaded' ? `Saved ${list.length} leads (${kind.toUpperCase()}).` : 'Export ready.');
    } catch (err) {
      toast(errorText(err), { error: true });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Leads</h1>
        <ExportButton count={list.length} busy={exporting} onExport={exportAs} />
      </div>
      <div className="row">
        <input className="input grow" type="search" placeholder="Search company, product, contact, hall" value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })} aria-label="Search" />
        <button type="button" className="btn" onClick={() => setOpen(true)} aria-label="Filters">
          <Icon name="filter" />{n ? `Filters · ${n}` : 'Filters'}
        </button>
      </div>
      <div className="quick-bar" role="toolbar" aria-label="Quick filters">
        {QUICK.map((q) => (
          <button key={q.id} type="button" className="chip" aria-pressed={q.on(filter)} onClick={() => setFilter(q.toggle(filter))}>{q.label}</button>
        ))}
      </div>
      {products && <p className="small muted">{list.length} lead{list.length === 1 ? '' : 's'}{filter.archived !== 'hide' ? ' (incl. archived)' : ''}</p>}
      {products && list.length === 0 && (
        <div className="empty">
          <span style={{ fontSize: '2rem' }}>🔎</span>
          {products.length ? 'No lead matches these filters.' : 'No leads yet.'}
          <Link className="btn btn--pink" to="/stand"><Icon name="plus" />Stand talk</Link>
        </div>
      )}
      <div className="product-grid">
        {list.map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}
      </div>
      {open && (
        <Sheet title="Filters" onClose={() => setOpen(false)}>
          <FilterPanel value={filter} onChange={setFilter} fairs={fairs} products={products} />
          <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>Show {list.length}</button>
        </Sheet>
      )}
    </div>
  );
}

function ExportButton({ count, busy, onExport }: { count: number; busy: boolean; onExport: (k: 'csv' | 'json') => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn--small" disabled={!count} onClick={() => setOpen(true)}>Export</button>
      {open && (
        <Sheet title={`Export ${count} lead${count === 1 ? '' : 's'}`} onClose={() => setOpen(false)}>
          <div className="stack">
            <p className="small muted">Exports exactly what the list shows right now (search and filters apply). CSV opens in Excel and Numbers.</p>
            <button type="button" className="btn btn--pink btn--big" disabled={busy} onClick={() => { onExport('csv'); setOpen(false); }}>CSV (Excel)</button>
            <button type="button" className="btn btn--big" disabled={busy} onClick={() => { onExport('json'); setOpen(false); }}>JSON</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
