import { useState } from 'react';
import { db } from '../db/db';
import { AiError, readBusinessCard } from '../services/ai';
import { decodeQr, parseQr, qrToContact, type QrResult } from '../services/qr';
import type { ContactSuggestion, Photo, Supplier, SupplierField } from '../types/models';
import { PhotoImg } from './ProductCard';
import { Field, errorText, toast } from './ui';

const FIELDS: { key: SupplierField; label: string; type?: string; inputMode?: 'tel' | 'email' | 'url' }[] = [
  { key: 'company', label: 'Company' },
  { key: 'contactPerson', label: 'Contact person' },
  { key: 'position', label: 'Position' },
  { key: 'phone', label: 'Phone', inputMode: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', inputMode: 'tel' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'email', label: 'Email', inputMode: 'email' },
  { key: 'website', label: 'Website', inputMode: 'url' },
  { key: 'address', label: 'Address' },
  { key: 'boothNumber', label: 'Booth number' },
];

/** Each detected field must be accepted, edited or ignored on its own. Nothing is overwritten silently. */
export function ContactReview({ suggestion, current, onAccept, onDone, note }: {
  suggestion: ContactSuggestion;
  current: Supplier;
  onAccept: (field: SupplierField, value: string) => void;
  onDone: () => void;
  note?: string;
}) {
  const keys = FIELDS.filter((f) => suggestion[f.key]);
  const [values, setValues] = useState<ContactSuggestion>(suggestion);
  const [handled, setHandled] = useState<Record<string, 'accepted' | 'ignored'>>({});
  const open = keys.filter((f) => !handled[f.key]);
  const finish = (k: SupplierField, how: 'accepted' | 'ignored') => {
    const next = { ...handled, [k]: how };
    setHandled(next);
    if (keys.every((f) => next[f.key])) onDone();
  };
  if (!keys.length) return <p className="small muted">Nothing readable found.</p>;
  return (
    <div className="card card--pink stack">
      <div className="row row--between"><h3>Review detected contact</h3><span className="ai-tag">{note ?? 'AI'}</span></div>
      {keys.map((f) => (
        <div key={f.key} className={`ocr-row${handled[f.key] ? ' accepted' : ''}`}>
          <Field label={f.label} note={current[f.key] && current[f.key] !== values[f.key] ? `Current: ${current[f.key]}` : undefined}>
            <input className="input" value={values[f.key] ?? ''} disabled={Boolean(handled[f.key])}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          </Field>
          {handled[f.key]
            ? <span className="small muted">{handled[f.key] === 'accepted' ? 'Accepted' : 'Ignored'}</span>
            : (
              <div className="row">
                <button type="button" className="btn btn--small btn--primary" onClick={() => { onAccept(f.key, values[f.key] ?? ''); finish(f.key, 'accepted'); }}>Accept</button>
                <button type="button" className="btn btn--small btn--quiet" onClick={() => finish(f.key, 'ignored')}>Ignore</button>
              </div>
            )}
        </div>
      ))}
      {open.length > 1 && (
        <button type="button" className="btn" onClick={() => { open.forEach((f) => onAccept(f.key, values[f.key] ?? '')); onDone(); }}>
          Accept remaining {open.length}
        </button>
      )}
    </div>
  );
}

function QrResultView({ result }: { result: QrResult }) {
  switch (result.kind) {
    case 'url': return <p className="small">URL: <a href={result.url} target="_blank" rel="noreferrer noopener">{result.url}</a></p>;
    case 'wechat': return <p className="small">WeChat ID: <strong>{result.wechat}</strong></p>;
    case 'whatsapp': return <p className="small">WhatsApp: <strong>{result.whatsapp}</strong></p>;
    case 'contact': return <p className="small">Contact card found.</p>;
    default: return <p className="small" style={{ overflowWrap: 'anywhere' }}>Raw value saved: <code>{result.raw}</code></p>;
  }
}

export function SupplierEditor({ supplier, onChange, photos, onPhotoPatch }: {
  supplier: Supplier;
  onChange: (s: Supplier) => void;
  photos: Photo[];
  onPhotoPatch?: (photoId: string, patch: Partial<Photo>) => void;
}) {
  const [review, setReview] = useState<{ suggestion: ContactSuggestion; note: string } | null>(null);
  const [qr, setQr] = useState<QrResult | null>(null);
  const [busy, setBusy] = useState('');
  const cards = photos.filter((p) => p.kind === 'info' && p.infoType === 'business_card');
  const qrs = photos.filter((p) => p.kind === 'info' && p.infoType === 'qr');
  const set = (k: SupplierField, v: string) => onChange({ ...supplier, [k]: v });

  async function readCard(photo: Photo) {
    setBusy(photo.id);
    try {
      const { contact, simulated } = await readBusinessCard(photo);
      setReview({ suggestion: contact, note: simulated ? 'Demo OCR (no API key)' : 'AI' });
    } catch (err) {
      toast(err instanceof AiError ? err.message : errorText(err), { error: true });
    } finally { setBusy(''); }
  }

  async function readQr(photo: Photo) {
    setBusy(photo.id);
    try {
      const blob = (await db.photoBlobs.get(photo.id))?.low;
      const raw = photo.qrValue ?? (blob ? await decodeQr(blob) : null);
      if (!raw) { toast('No QR code found. Try a sharper, closer photo.', { error: true }); return; }
      onPhotoPatch?.(photo.id, { qrValue: raw });
      const result = parseQr(raw);
      setQr(result);
      const contact = qrToContact(result);
      if (Object.keys(contact).length) setReview({ suggestion: contact, note: 'QR code' });
    } catch (err) {
      toast(errorText(err), { error: true });
    } finally { setBusy(''); }
  }

  let latest = supplier;
  const accept = (k: SupplierField, v: string) => { latest = { ...latest, [k]: v }; onChange(latest); };

  return (
    <div className="stack">
      {(cards.length > 0 || qrs.length > 0) && (
        <div className="stack">
          {[...cards, ...qrs].map((ph) => (
            <div key={ph.id} className="row">
              <div className="thumb"><PhotoImg photo={ph} /></div>
              <div className="grow small">{ph.infoType === 'qr' ? 'QR code' : 'Business card'}{ph.qrValue ? ' · read' : ''}</div>
              <button type="button" className="btn btn--small" disabled={busy === ph.id}
                onClick={() => (ph.infoType === 'qr' ? readQr(ph) : readCard(ph))}>
                {busy === ph.id ? 'Reading…' : ph.infoType === 'qr' ? 'Read QR' : 'Read card'}
              </button>
            </div>
          ))}
        </div>
      )}
      {qr && <QrResultView result={qr} />}
      {review && (
        <ContactReview suggestion={review.suggestion} current={supplier} note={review.note}
          onAccept={accept} onDone={() => { setReview(null); toast('Contact updated.'); }} />
      )}
      <div className="grid-2">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input className="input" value={supplier[f.key]} inputMode={f.inputMode}
              autoCapitalize={f.inputMode ? 'off' : 'words'} onChange={(e) => set(f.key, e.target.value)} />
          </Field>
        ))}
      </div>
    </div>
  );
}
