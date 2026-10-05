import type { ConfirmationResult } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Logo } from '../components/Icon';
import { Field } from '../components/ui';
import { APP } from '../config/app';
import { NoAccessError, authErrorText, confirmCode, resetPassword, sendCode, signInWithEmail } from '../services/auth';

function EmailLogin({ onPhone }: { onPhone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try { await signInWithEmail(email, password); }
    catch (err) { setError(err instanceof NoAccessError ? `${err.message} (UID ${err.uid})` : authErrorText(err)); }
    finally { setBusy(false); }
  }

  async function onReset() {
    setError(''); setInfo('');
    if (!email.trim()) { setError('Enter your email first.'); return; }
    try { await resetPassword(email); setInfo('If this email has an account, a reset link is on its way.'); }
    catch (err) { setError(authErrorText(err)); }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <Field label="Email">
        <input className="input" type="email" autoComplete="username" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password">
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button className="btn btn--primary btn--big" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <div className="row row--between small">
        <button type="button" className="link-btn" onClick={() => void onReset()}>Forgot password?</button>
        <button type="button" className="link-btn" onClick={onPhone}>Use phone (SMS)</button>
      </div>
      {info && <p className="hint-box">{info}</p>}
      {error && <p className="error-box">{error}</p>}
    </form>
  );
}

function PhoneLogin({ onEmail }: { onEmail: () => void }) {
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
    <div className="stack">
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
      <button type="button" className="link-btn small" onClick={onEmail}>Use email and password</button>
      {error && <p className="error-box">{error}</p>}
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  return (
    <div className="login">
      <div className="card stack">
        <div className="row" style={{ color: 'var(--pink)' }}><span style={{ width: 34, height: 34 }}><Logo /></span><strong style={{ color: 'var(--text)' }}>{APP.fullName}</strong></div>
        <p className="small muted">Sign in with your Jajehelp account. No registration here. Login needs internet once; afterwards the app works offline.</p>
        {mode === 'email' ? <EmailLogin onPhone={() => setMode('phone')} /> : <PhoneLogin onEmail={() => setMode('email')} />}
      </div>
    </div>
  );
}
