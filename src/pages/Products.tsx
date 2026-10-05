import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilterPanel } from '../components/FilterPanel';
import { Icon } from '../components/Icon';
import { ProductCard } from '../components/ProductCard';
import { Sheet } from '../components/ui';
import { useFairs, useProducts } from '../hooks/useData';
import { activeFilterCount, filterProducts, filterToParams, paramsToFilter, type ProductFilter } from '../services/filter';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const filter = useMemo(() => paramsToFilter(params), [params]);
  const products = useProducts();
  const fairs = useFairs();
  const [open, setOpen] = useState(false);
  const setFilter = (f: ProductFilter) => setParams(filterToParams(f), { replace: true });
  const list = useMemo(() => filterProducts(products ?? [], filter), [products, filter]);
  const n = activeFilterCount(filter);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Products</h1>
        <Link className="btn btn--small" to={`/export?${filterToParams(filter).toString()}`}><Icon name="pdf" />PDF</Link>
      </div>
      <div className="row">
        <input className="input grow" type="search" placeholder="Search product, company, contact, notes" value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })} aria-label="Search" />
        <button type="button" className="btn" onClick={() => setOpen(true)} aria-label="Filters">
          <Icon name="filter" />{n ? `Filters · ${n}` : 'Filters'}
        </button>
      </div>
      {products && <p className="small muted">{list.length} product{list.length === 1 ? '' : 's'}{filter.archived !== 'hide' ? ' (incl. archived)' : ''}</p>}
      {products && list.length === 0 && (
        <div className="empty">
          <span style={{ fontSize: '2rem' }}>🔎</span>
          {products.length ? 'No product matches these filters.' : 'No products yet.'}
          <Link className="btn btn--pink" to="/capture"><Icon name="plus" />Add product</Link>
        </div>
      )}
      <div className="product-grid">
        {list.map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}
      </div>
      {open && (
        <Sheet title="Filters" onClose={() => setOpen(false)}>
          <FilterPanel value={filter} onChange={setFilter} fairs={fairs} />
          <button type="button" className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>Show {list.length}</button>
        </Sheet>
      )}
    </div>
  );
}
