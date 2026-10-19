import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { startPageTranslation, stopPageTranslation } from '../services/pageTranslate';
import { errorText, toast } from './ui';

interface TranslateState {
  on: boolean;
  busy: boolean;
  toggle: () => void;
}

const Ctx = createContext<TranslateState>({ on: false, busy: false, toggle: () => {} });
export const useTranslate = () => useContext(Ctx);

/** Arabic view of the CURRENT page only: it switches off again as soon as you open another page. */
export function TranslateProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const { pathname } = useLocation();
  const first = useRef(true);

  const off = useCallback(() => { stopPageTranslation(); setOn(false); setBusy(false); }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    off();
  }, [pathname, off]);

  const toggle = useCallback(() => {
    if (on) { off(); return; }
    const root = document.getElementById('root');
    if (!root) return;
    setOn(true);
    setBusy(true);
    void startPageTranslation(root, (err) => {
      toast(errorText(err), { error: true, ms: 5000 });
      off();
    }).finally(() => setBusy(false));
  }, [on, off]);

  const value = useMemo(() => ({ on, busy, toggle }), [on, busy, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function TranslateButton() {
  const { on, busy, toggle } = useTranslate();
  return (
    <button type="button" className={`icon-btn translate-btn${on ? ' is-on' : ''}`} onClick={toggle} data-no-translate
      aria-pressed={on} aria-label={on ? 'Show page in English' : 'Show this page in Arabic'} title={on ? 'English' : 'العربية'}>
      {busy ? <span className="spinner" aria-hidden /> : <span aria-hidden>{on ? 'EN' : 'ع'}</span>}
    </button>
  );
}
