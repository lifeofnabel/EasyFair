import { useEffect, useState, type ReactNode } from 'react';
import type { Option } from '../constants/options';
import { createStore, useStore } from '../services/store';
import { Icon } from './Icon';

/* ---------- chips ---------- */

interface ChipsBase<T extends string> {
  options: Option<T>[];
  small?: boolean;
  /** Options to highlight as AI/voice suggestions. */
  suggested?: T[];
}

export function ChipSelect<T extends string>({ options, value, onChange, small, suggested, allowEmpty = true }:
  ChipsBase<T> & { value: T | null | undefined; onChange: (v: T | null) => void; allowEmpty?: boolean }) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} aria-pressed={value === o.id}
          className={`chip${small ? ' chip--sm' : ''}${suggested?.includes(o.id) ? ' chip--suggest' : ''}`}
          title={o.hint}
          onClick={() => onChange(value === o.id && allowEmpty ? null : o.id)}>
          {o.icon && <span aria-hidden>{o.icon}</span>}{o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipMulti<T extends string>({ options, value, onChange, small, suggested }:
  ChipsBase<T> & { value: T[]; onChange: (v: T[]) => void }) {
  const toggle = (id: T) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value.includes(o.id)}
          className={`chip${small ? ' chip--sm' : ''}${suggested?.includes(o.id) ? ' chip--suggest' : ''}`}
          title={o.hint} onClick={() => toggle(o.id)}>
          {o.icon && <span aria-hidden>{o.icon}</span>}{o.label}
        </button>
      ))}
    </div>
  );
}

export function YesNo({ value, onChange }: { value: boolean | undefined | null; onChange: (v: boolean | undefined) => void }) {
  return (
    <div className="chips">
      {[true, false].map((v) => (
        <button key={String(v)} type="button" className="chip chip--sm" aria-pressed={value === v}
          onClick={() => onChange(value === v ? undefined : v)}>
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  );
}

/* ---------- stars ---------- */

export function Stars({ value, onChange, size }: { value: number; onChange?: (v: number) => void; size?: 'sm' }) {
  return (
    <span className={`stars${size === 'sm' ? ' stars--sm' : ''}`} aria-label={`Interest ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`star${n <= value ? ' on' : ''}`} disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange?.(value === n ? 0 : n)}>★</button>
      ))}
    </span>
  );
}

/* ---------- tooltip (tap or hover) ---------- */

export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="tip" tabIndex={0} role="button" aria-label={text}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}>
      ?
      {open && <span className="tip__bubble" role="tooltip">{text}</span>}
    </span>
  );
}

export function Field({ label, tip, children, note }: { label: ReactNode; tip?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="field">
      <span className="field__label row">{label}{tip && <Tip text={tip} />}</span>
      {children}
      {note && <span className="field__note">{note}</span>}
    </div>
  );
}

/* ---------- sheet ---------- */

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </>
  );
}

/* ---------- toasts ---------- */

interface ToastItem { id: number; text: string; error?: boolean }
const toastStore = createStore<{ items: ToastItem[] }>({ items: [] });
let toastId = 0;

export function toast(text: string, opts: { error?: boolean; ms?: number } = {}) {
  const id = ++toastId;
  toastStore.set({ items: [...toastStore.get().items, { id, text, error: opts.error }] });
  setTimeout(() => toastStore.set({ items: toastStore.get().items.filter((t) => t.id !== id) }), opts.ms ?? 3200);
}

export function Toasts() {
  const { items } = useStore(toastStore);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`toast${t.error ? ' toast--error' : ''}`}>{t.text}</div>)}
    </div>
  );
}

export const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Something went wrong. Your data is saved.');
