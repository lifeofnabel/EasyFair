import { useEffect, useState } from 'react';
import { Field, errorText, toast } from '../components/ui';
import { AI_MODELS, APP, DEEPSEEK_MODELS, FIREBASE_MODE } from '../config/app';
import { db } from '../db/db';
import { loadDemoData, removeDemoData } from '../demo/demoData';
import { useFairs } from '../hooks/useData';
import { signOut } from '../services/auth';
import { newId } from '../services/ids';
import { session } from '../services/session';
import { DEFAULT_SETTINGS, claudeReady, deepseekReady, loadSettings, saveSettings } from '../services/settings';
import { useStore } from '../services/store';
import { markFairDirty, syncNow } from '../services/sync';
import type { AppSettings, Fair } from '../types/models';

function FairsEditor() {
  const fairs = useFairs();
  const [edit, setEdit] = useState<Fair | null>(null);
  async function save() {
    if (!edit || !edit.name.trim()) return;
    await db.fairs.put(edit);
    await markFairDirty(edit.id);
    setEdit(null);
    toast('Fair saved.');
  }
  return (
    <div className="card stack" id="fairs">
      <h3>Fairs</h3>
      <div className="list">
        {fairs?.map((f) => (
          <button key={f.id} type="button" className="list-row" style={{ background: 'none', border: 0, borderTop: '1px solid var(--line-soft)', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setEdit(f)}>
            <div className="grow"><strong>{f.name}</strong><div className="small muted">{f.city} · {f.startDate} – {f.endDate}</div></div>
          </button>
        ))}
      </div>
      {edit ? (
        <div className="stack">
          <Field label="Name"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <div className="grid-2">
            <Field label="City"><input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
            <Field label="Country"><input className="input" value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })} /></Field>
            <Field label="Start"><input className="input" type="date" value={edit.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} /></Field>
            <Field label="End"><input className="input" type="date" value={edit.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} /></Field>
          </div>
          <div className="row"><button type="button" className="btn btn--primary" onClick={() => void save()}>Save fair</button>
            <button type="button" className="btn btn--quiet" onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      ) : (
        <button type="button" className="btn" onClick={() => setEdit({ id: newId(), name: '', city: '', country: 'China', startDate: '', endDate: '' })}>Add fair</button>
      )}
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState<AppSettings | null>(null);
  const [showKey, setShowKey] = useState(false);
  const auth = useStore(session);
  useEffect(() => { void loadSettings().then(setS); }, []);
  if (!s) return null;

  const update = (patch: Partial<AppSettings>) => setS({ ...s, ...patch });
  async function save() {
    await saveSettings(s!);
    toast('Settings saved.');
    void syncNow();
  }

  async function exportBackup() {
    const [products, fairs] = await Promise.all([db.products.toArray(), db.fairs.toArray()]);
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), products, fairs }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `messe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <div className="page page--narrow">
      <div className="topbar"><h1>Settings</h1></div>

      <div className="card stack">
        <h3>AI</h3>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={s.aiProvider === 'mock'} onClick={() => update({ aiProvider: 'mock' })}>Demo AI (offline)</button>
          <button type="button" className="chip" aria-pressed={s.aiProvider === 'deepseek'} onClick={() => update({ aiProvider: 'deepseek' })}>DeepSeek</button>
          <button type="button" className="chip" aria-pressed={s.aiProvider === 'anthropic'} onClick={() => update({ aiProvider: 'anthropic' })}>Claude</button>
        </div>

        <Field label="DeepSeek API key" note="Works in China. Stored in your private Firebase profile (owner-only rules). Get it at platform.deepseek.com.">
          <div className="row">
            <input className="input grow" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder="sk-…"
              value={s.deepseekApiKey}
              onChange={(e) => update({ deepseekApiKey: e.target.value, ...(e.target.value.trim() ? { aiProvider: 'deepseek' as const } : {}) })} />
            <button type="button" className="btn btn--small" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
          </div>
        </Field>
        <Field label="DeepSeek model" note="Flash sees photos and costs very little. Results are stored and never re-run automatically.">
          <select className="select" value={s.deepseekModel} onChange={(e) => update({ deepseekModel: e.target.value })}>
            {DEEPSEEK_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>

        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>Claude (optional, needs VPN in China)</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <Field label="Claude API key">
              <input className="input" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder="sk-ant-…"
                value={s.anthropicApiKey}
                onChange={(e) => update({ anthropicApiKey: e.target.value, ...(e.target.value.trim() ? { aiProvider: 'anthropic' as const } : {}) })} />
            </Field>
            <Field label="Claude model">
              <select className="select" value={s.anthropicModel} onChange={(e) => update({ anthropicModel: e.target.value })}>
                {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
          </div>
        </details>

        <p className="small muted">
          {deepseekReady(s) ? 'DeepSeek is active.' : claudeReady(s) ? 'Claude is active.'
            : 'No key active: the offline Demo AI answers (basic titles, no translation).'}
        </p>
      </div>

      <div className="card stack">
        <h3>Cloudinary (photos)</h3>
        <div className="grid-2">
          <Field label="Cloud name"><input className="input" value={s.cloudinaryCloudName} onChange={(e) => update({ cloudinaryCloudName: e.target.value.trim() })} /></Field>
          <Field label="Folder"><input className="input" value={s.cloudinaryFolder} onChange={(e) => update({ cloudinaryFolder: e.target.value.trim() })} /></Field>
        </div>
        <Field label="API key" note="Public identifier, saved for reference. The API secret never goes into the app.">
          <input className="input" inputMode="numeric" autoComplete="off" value={s.cloudinaryApiKey} placeholder="e.g. 4698…"
            onChange={(e) => update({ cloudinaryApiKey: e.target.value.trim() })} />
        </Field>
        <Field label="Unsigned upload preset" note="Required for uploads. Cloudinary → Settings → Upload → Add upload preset → Signing mode: Unsigned.">
          <input className="input" value={s.cloudinaryUploadPreset} placeholder="e.g. messe_unsigned" onChange={(e) => update({ cloudinaryUploadPreset: e.target.value.trim() })} />
        </Field>
        <p className="small muted">Only the original is uploaded. The small version is a Cloudinary transformation, which saves mobile data.</p>
      </div>

      <div className="row">
        <button type="button" className="btn btn--primary grow" onClick={() => void save()}>Save settings</button>
        <button type="button" className="btn btn--quiet" onClick={() => setS({ ...DEFAULT_SETTINGS })}>Defaults</button>
      </div>

      <FairsEditor />

      <div className="card stack">
        <h3>Account & sync</h3>
        <p className="small">
          {FIREBASE_MODE === 'off' ? 'Local mode (Phase 1): data stays on this device. Firebase login and sync are prepared and switched on after approval.'
            : auth.status === 'signed_in' ? `Signed in with your Jajehelp account ${auth.label}` : 'Not signed in.'}
        </p>
        {auth.status === 'signed_in' && <button type="button" className="btn" onClick={() => void signOut()}>Sign out</button>}
      </div>

      <div className="card stack">
        <h3>Data</h3>
        <div className="row row--wrap">
          <button type="button" className="btn" onClick={() => void loadDemoData().then((n) => toast(n ? `${n} demo products added.` : 'Demo products already loaded.')).catch((e) => toast(errorText(e), { error: true }))}>Load demo data</button>
          <button type="button" className="btn btn--quiet" onClick={() => { if (confirm('Remove all demo products? Your real products stay.')) void removeDemoData().then((n) => toast(`${n} demo products removed.`)); }}>Remove demo data</button>
          <button type="button" className="btn" onClick={() => void exportBackup()}>Download backup (JSON)</button>
        </div>
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}>{APP.fullName} · v0.2</p>
    </div>
  );
}
