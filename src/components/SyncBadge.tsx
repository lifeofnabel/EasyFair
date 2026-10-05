import { useState } from 'react';
import { useStore } from '../services/store';
import { syncNow, syncState } from '../services/sync';
import { Sheet } from './ui';

const LABEL = {
  local: 'On device',
  offline: 'Offline',
  syncing: 'Syncing',
  synced: 'Synced',
  error: 'Not synced',
  signed_out: 'Signed out',
} as const;

export function SyncBadge() {
  const s = useStore(syncState);
  const [open, setOpen] = useState(false);
  const pending = s.uploadsEnabled && s.pendingPhotos > 0 ? ` · ${s.pendingPhotos}↑` : '';
  return (
    <>
      <button type="button" className={`sync sync--${s.status}`} onClick={() => setOpen(true)} aria-label={`Sync status: ${LABEL[s.status]}`}>
        <span className="sync__dot" />{LABEL[s.status]}{pending}
      </button>
      {open && (
        <Sheet title="Sync" onClose={() => setOpen(false)}>
          <div className="stack">
            <p>{s.status === 'local'
              ? 'Local mode: everything is stored on this device. Firebase sync starts after the Phase 2 setup.'
              : s.message || (s.online ? 'Products sync automatically in the background.' : 'No internet. Everything you capture is saved on this phone and syncs automatically later.')}</p>
            <dl className="kv">
              <dt>Products waiting</dt><dd>{s.pendingProducts}</dd>
              <dt>Photos waiting</dt><dd>{s.uploadsEnabled ? s.pendingPhotos : `${s.pendingPhotos} (Cloudinary not set up yet, kept on device)`}</dd>
              <dt>Last sync</dt><dd>{s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : '–'}</dd>
            </dl>
            <p className="small muted">Photos stay on this phone until the upload is confirmed. Nothing is deleted before that.</p>
            <button type="button" className="btn btn--primary" onClick={() => void syncNow()}>Sync now</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
