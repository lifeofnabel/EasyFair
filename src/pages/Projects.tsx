import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { INVESTORS, PROJECTS } from '../constants/options';
import { useFairs, useProducts } from '../hooks/useData';

export default function Projects() {
  const products = useProducts();
  const fairs = useFairs();
  const active = useMemo(() => (products ?? []).filter((p) => !p.archivedAt), [products]);

  return (
    <div className="page">
      <div className="topbar"><h1>Projects</h1></div>
      {PROJECTS.map((proj) => {
        const items = active.filter((p) => p.projects.includes(proj.id));
        const interesting = items.filter((p) => p.interest >= 4);
        const investorIds = [...new Set(items.flatMap((p) => p.investors.map((i) => i.investorId)))];
        return (
          <section key={proj.id} className="card stack">
            <div className="row row--between">
              <h3 style={{ fontSize: '1.1rem' }}>{proj.label}</h3>
              <Link className="btn btn--small" to={`/products?project=${proj.id}`}>Open</Link>
            </div>
            <div className="row row--wrap small">
              <span className="tag">{items.length} products</span>
              <span className="tag">{interesting.length} interesting</span>
              {investorIds.map((id) => {
                const inv = INVESTORS.find((i) => i.id === id);
                return <span key={id} className="tag">{inv?.label}{inv?.maxAmount ? ` ≤ €${(inv.maxAmount / 1000).toLocaleString('en-GB')}k` : ''}</span>;
              })}
            </div>
            {interesting.length > 0 && (
              <div className="product-grid">{interesting.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} fairs={fairs} />)}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
