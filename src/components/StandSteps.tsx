import type { ReactNode } from 'react';
import { CURRENCIES } from '../constants/options';
import {
  CERTS, DE_DISTRIBUTOR, INCOTERMS, LEAD_TIME_QUICK, MOQ_UNITS, PAYMENTS, RED_FLAGS, STAND_STEPS, SUPPLIER_TYPES, isSalesChance,
} from '../constants/stand';
import type { CertId, Currency, DeDistributor, Incoterm, PaymentId, Product, RedFlagId, StandData, SupplierType } from '../types/models';
import { ChipMulti, ChipSelect, Field, YesNo } from './ui';

type Patch = (changes: Partial<Product>) => void;

const num = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

function standPatch(p: Product, patch: Patch) {
  return (changes: Partial<StandData>) => patch({ stand: { ...p.stand, ...changes } });
}

function NumberInput({ value, onChange, placeholder, suffix, decimal = true }: {
  value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; suffix?: string; decimal?: boolean;
}) {
  return (
    <div className="num-input">
      <input className="input" inputMode={decimal ? 'decimal' : 'numeric'} placeholder={placeholder} value={value ?? ''}
        onChange={(e) => onChange(num(e.target.value))} />
      {suffix && <span className="num-input__suffix">{suffix}</span>}
    </div>
  );
}

function SalesChanceNote() {
  return (
    <div className="sales-chance sales-chance--big" role="status">
      🚀 SALES CHANCE
      <small>Kein Vertriebspartner in DE. Exklusivität erst nach einer Testbestellung verhandeln.</small>
    </div>
  );
}

/** The answer area of one stand step. Used one at a time in the stepper and all together on the lead page. */
export function StandStepBody({ step, p, patch, onPicked }: {
  step: number; p: Product; patch: Patch;
  /** Called after a single-choice answer (lets the stepper jump to the next question). */
  onPicked?: () => void;
}) {
  const set = standPatch(p, patch);
  const s = p.stand;
  const certs = s.certs ?? [];

  switch (step) {
    case 1:
      return (
        <ChipSelect big options={SUPPLIER_TYPES} value={s.supplierType ?? null}
          onChange={(v) => { set({ supplierType: (v ?? undefined) as SupplierType | undefined }); if (v) onPicked?.(); }} />
      );
    case 2:
      return (
        <div className="stack">
          <Field label="Product">
            <input className="input" placeholder="e.g. NTAG 424 DNA sticker" value={p.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Certificates" note="RED nur bei Funk (NFC, WLAN, Bluetooth).">
            <ChipMulti options={CERTS} value={certs}
              onChange={(next) => {
                const added = next.find((c) => !certs.includes(c));
                set({ certs: (added === 'NONE' ? ['NONE'] : next.filter((c) => c !== 'NONE')) as CertId[] });
              }} />
          </Field>
        </div>
      );
    case 3:
      return (
        <div className="stack">
          <Field label="Minimum order quantity">
            <NumberInput decimal={false} value={p.pricing.moq} onChange={(moq) => patch({ pricing: { ...p.pricing, moq } })} placeholder="e.g. 500" />
          </Field>
          <ChipSelect options={MOQ_UNITS.map((u) => ({ id: u, label: u }))} value={s.moqUnit ?? 'pcs'} allowEmpty={false}
            onChange={(u) => set({ moqUnit: u ?? 'pcs' })} />
        </div>
      );
    case 4:
      return (
        <div className="stack">
          <ChipSelect options={CURRENCIES.map((c) => ({ id: c, label: c }))} value={p.pricing.currency} allowEmpty={false}
            onChange={(c) => patch({ pricing: { ...p.pricing, currency: (c ?? 'USD') as Currency } })} />
          <div className="tier-grid">
            {([['q100', '100 pcs'], ['q500', '500 pcs'], ['q1000', '1,000 pcs']] as const).map(([k, label]) => (
              <Field key={k} label={label}>
                <NumberInput value={s.tiers?.[k]} placeholder="price" onChange={(v) => set({ tiers: { ...s.tiers, [k]: v } })} />
              </Field>
            ))}
          </div>
          <p className="small muted">Price per piece in {p.pricing.currency}.</p>
        </div>
      );
    case 5:
      return (
        <div className="stack">
          <Field label="Samples available?">
            <YesNo value={s.sample?.available} onChange={(v) => set({ sample: { ...s.sample, available: v } })} />
          </Field>
          {s.sample?.available !== false && (
            <>
              <Field label="Sample cost">
                <div className="row row--wrap">
                  <NumberInput value={s.sample?.cost} placeholder="cost" suffix={p.pricing.currency} onChange={(v) => set({ sample: { ...s.sample, cost: v } })} />
                  <button type="button" className="chip" aria-pressed={s.sample?.cost === 0}
                    onClick={() => set({ sample: { ...s.sample, available: true, cost: s.sample?.cost === 0 ? undefined : 0 } })}>Free</button>
                </div>
              </Field>
              <Field label="Refunded with the first order?">
                <YesNo value={s.sample?.refunded} onChange={(v) => set({ sample: { ...s.sample, refunded: v } })} />
              </Field>
            </>
          )}
        </div>
      );
    case 6:
      return (
        <div className="stack">
          <Field label="Lead time">
            <NumberInput decimal={false} value={s.leadTimeDays} placeholder="days" suffix="days" onChange={(v) => set({ leadTimeDays: v })} />
          </Field>
          <div className="chips">
            {LEAD_TIME_QUICK.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={s.leadTimeDays === d}
                onClick={() => set({ leadTimeDays: s.leadTimeDays === d ? undefined : d })}>{d} days</button>
            ))}
          </div>
        </div>
      );
    case 7:
      return (
        <div className="stack">
          <Field label="Payment">
            <ChipSelect options={PAYMENTS} value={s.payment ?? null} onChange={(v) => set({ payment: (v ?? undefined) as PaymentId | undefined })} />
          </Field>
          <Field label="Incoterm">
            <ChipSelect options={INCOTERMS} value={s.incoterm ?? null} onChange={(v) => set({ incoterm: (v ?? undefined) as Incoterm | undefined })} />
          </Field>
        </div>
      );
    case 8:
      return (
        <div className="stack">
          <ChipSelect big options={DE_DISTRIBUTOR} value={s.deDistributor ?? null}
            onChange={(v) => { set({ deDistributor: (v ?? undefined) as DeDistributor | undefined }); if (v) onPicked?.(); }} />
          {isSalesChance(p) && <SalesChanceNote />}
        </div>
      );
    default:
      return null;
  }
}

/** All eight answers in one place (lead page: every field stays editable). */
export function StandEditor({ p, patch }: { p: Product; patch: Patch }) {
  return (
    <div className="stack--lg">
      {STAND_STEPS.map((st) => (
        <Field key={st.id} label={`${st.n}. ${st.title}`} tip={st.hint}>
          <StandStepBody step={st.n} p={p} patch={patch} />
        </Field>
      ))}
    </div>
  );
}

export function RedFlagEditor({ value, onChange }: { value: RedFlagId[]; onChange: (v: RedFlagId[]) => void }) {
  return (
    <div className="stack">
      {RED_FLAGS.map((f) => {
        const on = value.includes(f.id);
        return (
          <label key={f.id} className="check-row">
            <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== f.id) : [...value, f.id])} />
            <span>{f.label}</span>
          </label>
        );
      })}
    </div>
  );
}

interface Quick {
  id: string;
  label: string;
  on: (p: Product) => boolean;
  toggle: (p: Product) => Partial<Product>;
}

const withStand = (p: Product, changes: Partial<StandData>): Partial<Product> => ({ stand: { ...p.stand, ...changes } });

const QUICK: Quick[] = [
  { id: 'factory', label: 'Factory', on: (p) => p.stand.supplierType === 'factory',
    toggle: (p) => withStand(p, { supplierType: p.stand.supplierType === 'factory' ? undefined : 'factory' }) },
  { id: 'trading', label: 'Trading co.', on: (p) => p.stand.supplierType === 'trading',
    toggle: (p) => withStand(p, { supplierType: p.stand.supplierType === 'trading' ? undefined : 'trading' }) },
  { id: 'nodist', label: 'No DE distributor', on: (p) => p.stand.deDistributor === 'no',
    toggle: (p) => withStand(p, { deDistributor: p.stand.deDistributor === 'no' ? undefined : 'no' }) },
  { id: 'dist', label: 'Has DE distributor', on: (p) => p.stand.deDistributor === 'yes',
    toggle: (p) => withStand(p, { deDistributor: p.stand.deDistributor === 'yes' ? undefined : 'yes' }) },
  { id: 'ce', label: 'CE ✓', on: (p) => (p.stand.certs ?? []).includes('CE'),
    toggle: (p) => {
      const c = p.stand.certs ?? [];
      return withStand(p, { certs: c.includes('CE') ? c.filter((x) => x !== 'CE') : [...c.filter((x) => x !== 'NONE'), 'CE'] });
    } },
  { id: 'rohs', label: 'RoHS ✓', on: (p) => (p.stand.certs ?? []).includes('ROHS'),
    toggle: (p) => {
      const c = p.stand.certs ?? [];
      return withStand(p, { certs: c.includes('ROHS') ? c.filter((x) => x !== 'ROHS') : [...c.filter((x) => x !== 'NONE'), 'ROHS'] });
    } },
  { id: 'freesample', label: 'Free samples', on: (p) => p.stand.sample?.available === true && p.stand.sample.cost === 0,
    toggle: (p) => (p.stand.sample?.cost === 0
      ? withStand(p, { sample: { ...p.stand.sample, cost: undefined } })
      : withStand(p, { sample: { ...p.stand.sample, available: true, cost: 0 } })) },
  { id: 'tt', label: 'T/T 30/70', on: (p) => p.stand.payment === 'TT_30_70',
    toggle: (p) => withStand(p, { payment: p.stand.payment === 'TT_30_70' ? undefined : 'TT_30_70' }) },
  { id: 'fob', label: 'FOB Shenzhen', on: (p) => p.stand.incoterm === 'FOB',
    toggle: (p) => withStand(p, { incoterm: p.stand.incoterm === 'FOB' ? undefined : 'FOB' }) },
  { id: 'oem', label: 'OEM possible', on: (p) => p.oem === true, toggle: (p) => ({ oem: p.oem === true ? null : true }) },
];

/** One-tap answers for the facts you hear most. They fill the same fields as the stand conversation. */
export function QuickAnswers({ p, patch }: { p: Product; patch: Patch }): ReactNode {
  return (
    <div className="chips">
      {QUICK.map((q) => (
        <button key={q.id} type="button" className="chip chip--sm" aria-pressed={q.on(p)} onClick={() => patch(q.toggle(p))}>{q.label}</button>
      ))}
    </div>
  );
}
