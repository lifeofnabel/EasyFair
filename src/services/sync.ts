import { COLLECTIONS, LOCAL_OWNER, SYNC_INTERVAL_MS } from '../config/app';
import { DEFAULT_FAIRS } from '../constants/fairs';
import { db, kvGet, kvSet } from '../db/db';
import type { AppSettings, Fair, Photo, Product } from '../types/models';
import { uploadToCloudinary } from './cloudinary';
import { firebaseEnabled, getFirebase } from './firebase';
import { nowIso } from './ids';
import { session } from './session';
import { cloudinaryReady, loadSettings } from './settings';
import { createStore } from './store';

export type SyncStatus = 'local' | 'offline' | 'syncing' | 'synced' | 'error' | 'signed_out';

export interface SyncState {
  status: SyncStatus;
  online: boolean;
  pendingProducts: number;
  pendingPhotos: number;
  /** False until Cloudinary is configured; photos then simply live on the device. */
  uploadsEnabled: boolean;
  lastSyncedAt: string | null;
  message: string;
}

export const syncState = createStore<SyncState>({
  status: firebaseEnabled() ? 'offline' : 'local',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendingProducts: 0,
  pendingPhotos: 0,
  uploadsEnabled: false,
  lastSyncedAt: null,
  message: '',
});

async function refreshCounts(): Promise<void> {
  const [pendingProducts, products] = await Promise.all([db.sync.where('dirty').equals(1).count(), db.products.toArray()]);
  const pendingPhotos = products.filter((p) => !p.id.startsWith('demo-')).reduce((n, p) => n + p.photos.filter((ph) => ph.uploadState !== 'uploaded').length, 0);
  syncState.set({ pendingProducts, pendingPhotos, uploadsEnabled: cloudinaryReady(await loadSettings()) });
}

/** Writes sync bookkeeping without touching the user-visible history. */
async function patchPhoto(productId: string, photoId: string, patch: Partial<Photo>): Promise<void> {
  await db.transaction('rw', db.products, db.sync, async () => {
    const p = await db.products.get(productId);
    if (!p) return;
    p.photos = p.photos.map((ph) => (ph.id === photoId ? { ...ph, ...patch } : ph));
    await db.products.put(p);
    await db.sync.put({ id: productId, dirty: 1 });
  });
}

/** Failed uploads wait before retrying, so a bad preset or flaky roaming never burns mobile data every 20 s. */
const RETRY_AFTER_MS = 5 * 60_000;
const failedAt = new Map<string, number>();
let lastPresetKey = '';

/** Photo blobs stay on the phone until Cloudinary confirms the upload. Only then the large copy is removed. */
async function uploadPhotos(settings: AppSettings): Promise<void> {
  if (!cloudinaryReady(settings)) return;
  const presetKey = `${settings.cloudinaryCloudName}/${settings.cloudinaryUploadPreset}`;
  if (presetKey !== lastPresetKey) { failedAt.clear(); lastPresetKey = presetKey; }
  const products = await db.products.toArray();
  for (const p of products) {
    if (p.id.startsWith('demo-')) continue;
    for (const photo of p.photos) {
      if (photo.uploadState === 'uploaded') continue;
      if (Date.now() - (failedAt.get(photo.id) ?? 0) < RETRY_AFTER_MS) continue;
      const blob = await db.photoBlobs.get(photo.id);
      const source = blob?.high ?? blob?.low;
      if (!source) continue;
      await patchPhoto(p.id, photo.id, { uploadState: 'uploading' });
      try {
        const remote = await uploadToCloudinary(settings, source, photo.id);
        await patchPhoto(p.id, photo.id, { uploadState: 'uploaded', remote });
        await db.photoBlobs.update(photo.id, { high: undefined });
        failedAt.delete(photo.id);
      } catch {
        failedAt.set(photo.id, Date.now());
        await patchPhoto(p.id, photo.id, { uploadState: 'failed' });
        return; // same cause will likely hit the next photo too; try again next round
      }
    }
  }
}

async function pushProducts(uid: string): Promise<void> {
  const { db: fdb, fs } = await getFirebase();
  const dirty = await db.sync.where('dirty').equals(1).toArray();
  for (const { id } of dirty) {
    let p = await db.products.get(id);
    if (!p) { await db.sync.delete(id); continue; }
    // Demo products are for trying the app only and never reach the real database.
    if (id.startsWith('demo-')) { await db.sync.put({ id, dirty: 0 }); continue; }
    // Left over from another account on this device: not ours to upload.
    if (p.ownerId !== uid && p.ownerId !== LOCAL_OWNER) { await db.sync.put({ id, dirty: 0 }); continue; }
    if (p.ownerId === LOCAL_OWNER) {
      p = { ...p, ownerId: uid };
      await db.products.put(p);
    }
    const sentUpdatedAt = p.updatedAt;
    await fs.setDoc(fs.doc(fdb, COLLECTIONS.products, p.id), p);
    const now = await db.products.get(id);
    if (now?.updatedAt === sentUpdatedAt) await db.sync.put({ id, dirty: 0, lastSyncedAt: nowIso() });
  }
}

async function pushDeletes(): Promise<void> {
  const pending = await kvGet<string[]>('pendingDeletes', []);
  if (!pending.length) return;
  const { db: fdb, fs } = await getFirebase();
  const left: string[] = [];
  for (const id of pending) {
    try { await fs.deleteDoc(fs.doc(fdb, COLLECTIONS.products, id)); } catch { left.push(id); }
  }
  await kvSet('pendingDeletes', left);
}

const RECONCILE_EVERY_MS = 10 * 60_000;
let lastReconcile = 0;

/** Products deleted on another device: remove local copies that were synced before but no longer exist remotely. */
async function reconcileDeletes(uid: string): Promise<void> {
  if (Date.now() - lastReconcile < RECONCILE_EVERY_MS) return;
  const { db: fdb, fs } = await getFirebase();
  const snap = await fs.getDocs(fs.query(fs.collection(fdb, COLLECTIONS.products), fs.where('ownerId', '==', uid)));
  lastReconcile = Date.now();
  const remote = new Set(snap.docs.map((d) => d.id));
  const metas = await db.sync.toArray();
  const gone = metas.filter((m) => m.lastSyncedAt && !m.dirty && !m.id.startsWith('demo-') && !remote.has(m.id)).map((m) => m.id);
  // Never wipe everything because of one odd answer.
  if (!remote.size || !gone.length || gone.length > Math.max(3, metas.length / 2)) return;
  await db.transaction('rw', db.products, db.photoBlobs, db.sync, async () => {
    await db.products.bulkDelete(gone);
    await db.photoBlobs.where('productId').anyOf(gone).delete();
    await db.sync.bulkDelete(gone);
  });
}

async function pullProducts(uid: string): Promise<void> {
  const { db: fdb, fs } = await getFirebase();
  const deleting = new Set(await kvGet<string[]>('pendingDeletes', []));
  const since = await kvGet<string>('lastPullAt', '');
  const base = fs.collection(fdb, COLLECTIONS.products);
  const q = since
    ? fs.query(base, fs.where('ownerId', '==', uid), fs.where('updatedAt', '>', since))
    : fs.query(base, fs.where('ownerId', '==', uid));
  const snap = await fs.getDocs(q);
  let newest = since;
  for (const doc of snap.docs) {
    const remote = doc.data() as Product;
    if (remote.updatedAt > newest) newest = remote.updatedAt;
    if (deleting.has(remote.id)) continue;
    const [local, meta] = await Promise.all([db.products.get(remote.id), db.sync.get(remote.id)]);
    if (meta?.dirty) continue; // local change wins and will be pushed
    if (!local || remote.updatedAt > local.updatedAt) {
      await db.products.put(remote);
      await db.sync.put({ id: remote.id, dirty: 0, lastSyncedAt: nowIso() });
    }
  }
  await kvSet('lastPullAt', newest);
}

async function syncFairs(uid: string): Promise<void> {
  const { db: fdb, fs } = await getFirebase();
  const snap = await fs.getDocs(fs.query(fs.collection(fdb, COLLECTIONS.fairs), fs.where('ownerId', '==', uid)));
  if (snap.empty) {
    const local = await db.fairs.toArray();
    const seed = local.length ? local : DEFAULT_FAIRS;
    await Promise.all(seed.map((f) => fs.setDoc(fs.doc(fdb, COLLECTIONS.fairs, f.id), { ...f, ownerId: uid })));
    return;
  }
  const dirty = await kvGet<string[]>('dirtyFairs', []);
  for (const id of dirty) {
    const f = await db.fairs.get(id);
    if (f) await fs.setDoc(fs.doc(fdb, COLLECTIONS.fairs, f.id), { ...f, ownerId: uid });
  }
  await kvSet('dirtyFairs', []);
  const fresh = await fs.getDocs(fs.query(fs.collection(fdb, COLLECTIONS.fairs), fs.where('ownerId', '==', uid)));
  await db.fairs.bulkPut(fresh.docs.map((d) => {
    const { ownerId: _owner, ...fair } = d.data() as Fair & { ownerId: string };
    return fair;
  }));
}

async function syncSettings(uid: string): Promise<void> {
  const { db: fdb, fs } = await getFirebase();
  const ref = fs.doc(fdb, COLLECTIONS.settings, uid);
  if (await kvGet('settingsDirty', false)) {
    const settings = await loadSettings();
    await fs.setDoc(ref, { ...settings, ownerId: uid, updatedAt: await kvGet('settingsUpdatedAt', nowIso()) });
    await kvSet('settingsDirty', false);
    return;
  }
  const snap = await fs.getDoc(ref);
  if (snap.exists()) {
    const { ownerId: _o, updatedAt: _u, ...remote } = snap.data();
    await kvSet('settings', remote);
  }
}

let running = false;

export async function syncNow(): Promise<void> {
  if (running) return;
  const online = navigator.onLine;
  syncState.set({ online });
  await refreshCounts();
  if (!firebaseEnabled()) {
    // Local mode still uploads photos if Cloudinary is configured.
    if (online) await uploadPhotos(await loadSettings()).catch(() => {});
    syncState.set({ status: 'local' });
    await refreshCounts();
    return;
  }
  const { status, uid } = session.get();
  if (status !== 'signed_in' || !uid) { syncState.set({ status: 'signed_out' }); return; }
  if (!online) { syncState.set({ status: 'offline' }); return; }

  running = true;
  syncState.set({ status: 'syncing', message: '' });
  try {
    await syncSettings(uid);
    await uploadPhotos(await loadSettings());
    await pushProducts(uid);
    await pushDeletes();
    await pullProducts(uid);
    await reconcileDeletes(uid);
    await syncFairs(uid);
    await refreshCounts();
    const { pendingProducts } = syncState.get();
    syncState.set({ status: pendingProducts ? 'error' : 'synced', lastSyncedAt: nowIso(),
      message: pendingProducts ? 'Some products are still waiting to sync.' : '' });
  } catch (err) {
    console.warn('[sync]', (err as Error)?.message);
    syncState.set({
      status: navigator.onLine ? 'error' : 'offline',
      message: 'Couldn\'t sync your products. Your data is saved locally and will be synchronized when the connection is available.',
    });
  } finally {
    running = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startSync(): void {
  if (timer) return;
  const kick = () => { void syncNow(); };
  window.addEventListener('online', kick);
  window.addEventListener('offline', () => syncState.set({ online: false, status: firebaseEnabled() ? 'offline' : 'local' }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(); });
  session.subscribe(kick);
  const soon = () => { setTimeout(kick, 1500); };
  db.sync.hook('creating', (_key, obj) => { if (obj.dirty === 1) soon(); });
  db.sync.hook('updating', (mods) => { if ((mods as { dirty?: number }).dirty === 1) soon(); });
  timer = setInterval(kick, SYNC_INTERVAL_MS);
  kick();
}

export async function markFairDirty(id: string): Promise<void> {
  const list = await kvGet<string[]>('dirtyFairs', []);
  if (!list.includes(id)) await kvSet('dirtyFairs', [...list, id]);
}
