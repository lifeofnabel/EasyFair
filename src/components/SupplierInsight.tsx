import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/db';

/** Count of active products from the same company (supplier insight). */
export function useSupplierCount(company: string | undefined): number {
  return useLiveQuery(async () => {
    const c = company?.trim().toLowerCase();
    if (!c) return 0;
    return db.products.filter((p) => !p.archivedAt && p.supplier.company.trim().toLowerCase() === c).count();
  }, [company]) ?? 0;
}

export function SupplierInsight({ company }: { company: string }) {
  const n = useSupplierCount(company);
  if (n < 3) return null;
  return (
    <Link to={`/products?q=${encodeURIComponent(company)}`} className="hint-box" style={{ textDecoration: 'none', display: 'block' }}>
      💡 You have <strong>{n} products</strong> from {company}. Supplier focus? Tap to see all.
    </Link>
  );
}
