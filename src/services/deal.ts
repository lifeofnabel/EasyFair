import { CERTS, INCOTERMS, PAYMENTS, SUPPLIER_TYPES, bestTierPrice } from '../constants/stand';
import { labelOf } from '../constants/options';
import type { Product } from '../types/models';
import { money } from './format';

/** The deal terms heard at the stand as label/value rows (PDF and summaries). Only rows with content. */
export function dealRows(p: Product): [string, string][] {
  const s = p.stand;
  const cur = p.pricing.currency;
  const rows: [string, string][] = [];
  const best = p.pricing.supplierPrice ?? bestTierPrice(s);
  rows.push(['Price (best)', money(best, cur)]);
  const t = s.tiers;
  if (t && (t.q100 || t.q500 || t.q1000)) {
    rows.push(['Tiers', [`100: ${t.q100 ?? '–'}`, `500: ${t.q500 ?? '–'}`, `1k: ${t.q1000 ?? '–'}`].join(' · ')]);
  }
  rows.push(['MOQ', p.pricing.moq !== undefined ? `${p.pricing.moq} ${s.moqUnit ?? 'pcs'}` : 'Unknown']);
  if (s.sample) {
    const sample = s.sample.available === false ? 'No'
      : [s.sample.cost === 0 ? 'Free' : s.sample.cost !== undefined ? `${s.sample.cost} ${cur}` : s.sample.available ? 'Yes' : '',
        s.sample.refunded ? 'refunded on 1st order' : ''].filter(Boolean).join(', ');
    rows.push(['Samples', sample || 'Unknown']);
  }
  if (s.leadTimeDays !== undefined) rows.push(['Lead time', `${s.leadTimeDays} days`]);
  const terms = [labelOf(PAYMENTS, s.payment), labelOf(INCOTERMS, s.incoterm)].filter(Boolean).join(' · ');
  if (terms) rows.push(['Terms', terms]);
  if (s.supplierType) rows.push(['Supplier', labelOf(SUPPLIER_TYPES, s.supplierType)]);
  if (s.certs?.length) rows.push(['Certificates', s.certs.map((c) => labelOf(CERTS, c)).join(', ')]);
  if (s.deDistributor) rows.push(['DE distributor', s.deDistributor === 'no' ? 'No → sales chance' : s.deDistributor === 'yes' ? 'Yes' : 'Unknown']);
  if (p.pricing.targetSellingPrice !== undefined) rows.push(['Target price', money(p.pricing.targetSellingPrice, cur)]);
  if (p.pricing.estimatedMargin !== undefined) rows.push(['Margin', `${p.pricing.estimatedMargin}%`]);
  if (p.pricing.startupCapital !== undefined) rows.push(['Startup capital', money(p.pricing.startupCapital, 'EUR')]);
  if (p.oem !== null) rows.push(['OEM', p.oem ? 'Yes' : 'No']);
  return rows;
}
