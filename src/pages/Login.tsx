import type { ConfirmationResult } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Logo } from '../components/Icon';
import { Field } from '../components/ui';
import { APP } from '../config/app';
import { NoAccessError, authErrorText, confirmCode, sendCode } from '../services/auth';

export default function Login() {
  const [phone, setPhone] = useState('+49');
  const [code, setCode] = useState('');
  const [conf, setConf] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { setConf(await sendCode(phone.replace(/[^\d+]/g, ''), 'messe-recaptcha')); }
    catch (err) { setError(authErrorText(err)); }
    finally { setBusy(false); }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await confirmCode(conf!, code.replace(/\D/g, '')); }
    catch (err) { setError(err instanceof NoAccessError ? `${err.message} (UID ${err.uid})` : authErrorText(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <div className="card stack">
        <div className="row" style={{ color: 'var(--pink)' }}><span style={{ width: 34, height: 34 }}><Logo /></span><strong style={{ color: 'var(--text)' }}>{APP.fullName}</strong></div>
        <p className="small muted">Sign in with your Jajehelp account. No separate registration. Login needs internet once; afterwards the app works offline.</p>
        {!conf ? (
          <form className="stack" onSubmit={onSend}>
            <Field label="Phone number"><input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            <button className="btn btn--primary btn--big" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form className="stack" onSubmit={onVerify}>
            <Field label="SMS code"><input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <button className="btn btn--primary btn--big" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="btn btn--quiet" onClick={() => { setConf(null); setCode(''); }}>Change number</button>
          </form>
        )}
        {error && <p className="error-box">{error}</p>}
      </div>
    </div>
  );
}
