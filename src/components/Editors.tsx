import {
  BUSINESS_TYPES, CURRENCIES, INVESTMENT_TYPES, INVESTORS, MARKETS, PROJECTS, PURPOSES, READINESS, REG_TOPICS, RISK_LEVELS, SEASONS,
} from '../constants/options';
import type { Currency, InvestorId, InvestorLink, Pricing, Product, Regulatory } from '../types/models';
import { ChipMulti, ChipSelect, Field, Tip } from './ui';

type Patch = (patch: Partial<Product>) => void;

export function MarketEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  return (
    <Field label="Target market">
      <ChipMulti options={MARKETS} value={p.targetMarkets} onChange={(targetMarkets) => onPatch({ targetMarkets })} />
      {p.targetMarkets.includes('OTHER') && (
        <input className="input" placeholder="Country, e.g. Austria, Jordan" value={p.otherCountries.join(', ')}
          onChange={(e) => onPatch({ otherCountries: e.target.value.split(',').map((s) => s.trimStart()) })}
          onBlur={(e) => onPatch({ otherCountries: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
      )}
    </Field>
  );
}

export function BusinessTypeEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  return (
    <Field label={<>Business type <Tip text={BUSINESS_TYPES.map((b) => `${b.label}: ${b.hint}`).join('\n')} /></>}>
      <ChipSelect options={BUSINESS_TYPES} value={p.businessType} onChange={(businessType) => onPatch({ businessType })} />
    </Field>
  );
}

export function ProjectsEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  return (
    <Field label="Tags">
      <ChipMulti options={PROJECTS} value={p.projects} onChange={(projects) => onPatch({ projects })} />
    </Field>
  );
}

export function SeasonPurposeEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  return (
    <>
      <Field label="Season">
        <ChipMulti small options={SEASONS} value={p.seasons} onChange={(seasons) => onPatch({ seasons })} />
      </Field>
      <Field label="What do you want to do with this product?">
        <ChipMulti small options={PURPOSES} value={p.purposes} onChange={(purposes) => onPatch({ purposes })} />
      </Field>
    </>
  );
}

export function InvestorEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  const ids = p.investors.map((i) => i.investorId);
  const options = INVESTORS.map((i) => ({ id: i.id, label: i.maxAmount ? `${i.label} · ≤ €${(i.maxAmount / 1000).toLocaleString('en-GB')}k` : i.label }));
  const setIds = (next: InvestorId[]) =>
    onPatch({ investors: next.map((id) => p.investors.find((i) => i.investorId === id) ?? { investorId: id }) });
  const update = (id: InvestorId, patch: Partial<InvestorLink>) =>
    onPatch({ investors: p.investors.map((i) => (i.investorId === id ? { ...i, ...patch } : i)) });
  return (
    <div className="stack">
      <Field label="Potential investor">
        <ChipMulti small options={options} value={ids} onChange={setIds} />
      </Field>
      {p.investors.filter((i) => i.investorId !== 'UNKNOWN').map((i) => (
        <div key={i.investorId} className="card stack">
          <strong className="small">{i.investorId}</strong>
          <ChipSelect small options={INVESTMENT_TYPES} value={i.type ?? null} onChange={(type) => update(i.investorId, { type: type ?? undefined })} />
          <ChipSelect small options={READINESS} value={i.readiness ?? null} onChange={(readiness) => update(i.investorId, { readiness: readiness ?? undefined })} />
        </div>
      ))}
    </div>
  );
}

const num = (v: string) => (v === '' ? undefined : Number(v.replace(',', '.')));

export function PricingEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  const set = (patch: Partial<Pricing>) => onPatch({ pricing: { ...p.pricing, ...patch } });
  const pr = p.pricing;
  const margin = pr.supplierPrice && pr.targetSellingPrice
    ? Math.round(((pr.targetSellingPrice - pr.supplierPrice) / pr.targetSellingPrice) * 100) : null;
  return (
    <div className="stack">
      <div className="grid-2">
        <Field label="Supplier price">
          <input className="input" inputMode="decimal" value={pr.supplierPrice ?? ''} onChange={(e) => set({ supplierPrice: num(e.target.value) })} />
        </Field>
        <Field label="Currency">
          <select className="select" value={pr.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="MOQ">
          <input className="input" inputMode="numeric" value={pr.moq ?? ''} onChange={(e) => set({ moq: num(e.target.value) })} />
        </Field>
        <Field label="Target selling price" note={margin !== null ? `≈ ${margin}% gross margin (same currency, before costs)` : undefined}>
          <input className="input" inputMode="decimal" value={pr.targetSellingPrice ?? ''} onChange={(e) => set({ targetSellingPrice: num(e.target.value) })} />
        </Field>
        <Field label="Estimated margin %">
          <input className="input" inputMode="decimal" value={pr.estimatedMargin ?? ''} onChange={(e) => set({ estimatedMargin: num(e.target.value) })} />
        </Field>
        <Field label="Startup capital (EUR)">
          <input className="input" inputMode="decimal" value={pr.startupCapital ?? ''} onChange={(e) => set({ startupCapital: num(e.target.value) })} />
        </Field>
      </div>
      <Field label="Price note">
        <input className="input" value={pr.note} placeholder="e.g. FOB Shenzhen, incl. packaging" onChange={(e) => set({ note: e.target.value })} />
      </Field>
      <Field label="OEM / private label offered?">
        <ChipSelect small options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]}
          value={p.oem === null ? null : p.oem ? 'yes' : 'no'} onChange={(v) => onPatch({ oem: v === null ? null : v === 'yes' })} />
      </Field>
    </div>
  );
}

export function RegulatoryEditor({ p, onPatch }: { p: Product; onPatch: Patch }) {
  const set = (patch: Partial<Regulatory>) => onPatch({ regulatory: { ...p.regulatory, ...patch } });
  return (
    <div className="stack">
      <Field label="Regulatory risk">
        <ChipSelect options={RISK_LEVELS} value={p.regulatory.risk} allowEmpty={false} onChange={(risk) => set({ risk: risk ?? 'unknown' })} />
      </Field>
      <Field label="Relevant topics" note="Orientation only, not legal advice.">
        <div className="chips">
          {REG_TOPICS.map((t) => {
            const on = p.regulatory.topics.includes(t.id);
            return (
              <span key={t.id} className="row" style={{ gap: 4 }}>
                <button type="button" className="chip chip--sm" aria-pressed={on}
                  onClick={() => set({ topics: on ? p.regulatory.topics.filter((x) => x !== t.id) : [...p.regulatory.topics, t.id] })}>
                  {t.label}
                </button>
                <Tip text={t.hint ?? ''} />
              </span>
            );
          })}
        </div>
      </Field>
      <Field label="Regulatory note">
        <input className="input" value={p.regulatory.note} onChange={(e) => set({ note: e.target.value })} />
      </Field>
    </div>
  );
}
