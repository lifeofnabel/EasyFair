import { useState } from 'react';
import { Link } from 'react-router-dom';
import { updateProduct } from '../db/repo';
import { followUpText } from '../services/followup';
import { productTitle } from '../services/format';
import type { Product } from '../types/models';
import { Icon } from './Icon';
import { PriorityBadge, SalesChance } from './LeadBadges';
import { errorText, toast } from './ui';

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** Ready-to-send WeChat message for one lead. Edit, copy or share it, then mark it as sent. */
export function FollowUpCard({ p, link = true }: { p: Product; link?: boolean }) {
  const [text, setText] = useState(() => followUpText(p));
  const [open, setOpen] = useState(false);
  const sent = Boolean(p.followUpSentAt);
  const label = p.supplier.company || productTitle(p);

  async function copy() {
    toast((await copyText(text)) ? 'Message copied. Paste it into WeChat.' : 'Copy not available. Select the text and copy it.', { error: false });
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (err) { if ((err as DOMException)?.name === 'AbortError') return; }
    }
    await copy();
  }

  async function toggleSent() {
    try {
      await updateProduct(p.id, { followUpSentAt: sent ? null : new Date().toISOString() }, 'followup_sent');
      toast(sent ? 'Marked as not sent.' : 'Marked as sent ✓');
    } catch (err) { toast(errorText(err), { error: true }); }
  }

  return (
    <div className={`card stack followup-card${sent ? ' is-sent' : ''}`}>
      <div className="row row--between">
        <div className="grow">
          {link ? <Link to={`/product/${p.id}`} className="followup-card__title truncate">{label}</Link> : <strong>{label}</strong>}
          <div className="small muted truncate">
            {[p.hall && `Hall ${p.hall}`, p.supplier.boothNumber && `Booth ${p.supplier.boothNumber}`, p.supplier.contactPerson].filter(Boolean).join(' · ') || '–'}
          </div>
        </div>
        <div className="row"><SalesChance p={p} /><PriorityBadge priority={p.priority} /></div>
      </div>

      {p.supplier.wechat && (
        <div className="row small">
          <span className="muted">WeChat</span> <strong data-no-translate>{p.supplier.wechat}</strong>
          <button type="button" className="btn btn--small btn--quiet" onClick={async () => toast((await copyText(p.supplier.wechat)) ? 'WeChat ID copied.' : 'Copy not available.')}>Copy</button>
        </div>
      )}

      {open && <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />}
      {!open && <p className="small followup-card__preview" onClick={() => setOpen(true)}>{text}</p>}

      <div className="row row--wrap">
        <button type="button" className="btn btn--pink" onClick={() => void copy()}><Icon name="edit" />Copy message</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button type="button" className="btn" onClick={() => void share()}>Share</button>}
        <button type="button" className="btn btn--quiet" onClick={() => setOpen(!open)}>{open ? 'Done editing' : 'Edit'}</button>
        <button type="button" className={`btn ${sent ? '' : 'btn--primary'}`} onClick={() => void toggleSent()}>{sent ? '✓ Sent · undo' : 'Mark as sent'}</button>
      </div>
      {sent && p.followUpSentAt && <p className="small muted">Sent {new Date(p.followUpSentAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
    </div>
  );
}

