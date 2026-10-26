import { useCallback, useEffect, useRef, useState } from 'react';
import { toast, errorText } from '../components/ui';
import { hasStandAnswers } from '../constants/stand';
import { db, kvGet, kvSet } from '../db/db';
import { attachStagedPhotos, discardPhotoBlobs, newCaptureProduct, saveNewProduct, stagePhoto } from '../db/repo';
import { tap } from '../services/feedback';
import { decodeQr } from '../services/qr';
import type { Photo, PhotoKind, Product } from '../types/models';

export type DraftKind = 'capture' | 'stand';

const MAX_AGE_MS = 12 * 3_600_000;

interface StoredDraft { draft: Product; at: number }

/** Something worth keeping. Fair and hall alone (pre-filled) are not. */
export function isMeaningful(p: Product): boolean {
  return Boolean(
    p.photos.length || p.voiceTranscript.trim() || p.name.trim() || p.notes.trim() || p.description.trim()
    || p.supplier.company.trim() || p.supplier.wechat.trim() || p.priority || hasStandAnswers(p.stand),
  );
}

async function dropStored(key: string): Promise<void> {
  const stored = await kvGet<StoredDraft | null>(key, null);
  if (stored?.draft.photos.length) await discardPhotoBlobs(stored.draft.photos.map((ph) => ph.id));
  await kvSet(key, null);
}

/**
 * Working copy of a new lead/product shared by quick capture and the stand conversation.
 * - Photos are written to IndexedDB the moment they are taken.
 * - The draft is mirrored to IndexedDB, so an iOS app restart (e.g. after the camera) loses nothing.
 * - Leaving the page without "Save" keeps anything meaningful as a product.
 */
export function useCaptureDraft(kind: DraftKind, opts: { sameBoothId?: string | null; files?: File[]; fresh?: boolean } = {}) {
  const key = `draft:${kind}`;
  const [draft, setDraftState] = useState<Product | null>(null);
  const [busy, setBusy] = useState(0);
  const [restored, setRestored] = useState(false);
  const draftRef = useRef<Product | null>(null);
  const saved = useRef(false);
  const staged = useRef<string[]>([]);
  const filesRef = useRef(opts.files ?? []);
  const sameBooth = opts.sameBoothId ?? null;
  const fresh = Boolean(opts.fresh);

  const setDraft = useCallback((next: Product) => { draftRef.current = next; setDraftState(next); }, []);
  const update = useCallback((fn: (p: Product) => Product) => {
    const cur = draftRef.current;
    if (cur) setDraft(fn(cur));
  }, [setDraft]);
  const patch = useCallback((changes: Partial<Product>) => update((p) => ({ ...p, ...changes })), [update]);

  const setPhoto = useCallback((id: string, changes: Partial<Photo>) =>
    update((p) => ({ ...p, photos: p.photos.map((ph) => (ph.id === id ? { ...ph, ...changes } : ph)) })), [update]);

  const onFile = useCallback(async (file: File, photoKind: PhotoKind) => {
    setBusy((b) => b + 1);
    try {
      const photo = await stagePhoto(file, photoKind, photoKind === 'info' ? 'business_card' : undefined);
      staged.current.push(photo.id);
      update((p) => ({ ...p, photos: [...p.photos, photo] }));
      tap();
      if (photoKind === 'info') {
        const blob = (await db.photoBlobs.get(photo.id))?.low;
        const qr = blob ? await decodeQr(blob).catch(() => null) : null;
        if (qr) setPhoto(photo.id, { infoType: 'qr', qrValue: qr });
      }
    } catch (err) {
      toast(errorText(err), { error: true });
    } finally {
      setBusy((b) => b - 1);
    }
  }, [update, setPhoto]);

  const removePhoto = useCallback((id: string) => {
    update((p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== id) }));
    staged.current = staged.current.filter((x) => x !== id);
    void discardPhotoBlobs([id]);
  }, [update]);

  useEffect(() => {
    let alive = true;
    saved.current = false;
    (async () => {
      let initial: Product | null = null;
      let wasRestored = false;
      const explicitNew = fresh || Boolean(sameBooth) || filesRef.current.length > 0;
      const stored = await kvGet<StoredDraft | null>(key, null);
      if (stored && !explicitNew && Date.now() - stored.at < MAX_AGE_MS && isMeaningful(stored.draft)) {
        initial = stored.draft;
        wasRestored = true;
      } else if (stored) {
        await dropStored(key);
      }
      if (!initial) {
        const src = sameBooth ? await db.products.get(sameBooth) : undefined;
        initial = await newCaptureProduct({ sameBoothAs: src });
      }
      if (!alive) return;
      staged.current = initial.photos.map((ph) => ph.id);
      setDraft(initial);
      setRestored(wasRestored);
      const files = filesRef.current;
      filesRef.current = [];
      files.forEach((f) => void onFile(f, 'product'));
    })();
    return () => {
      alive = false;
      if (saved.current) return;
      const d = draftRef.current;
      if (d && isMeaningful(d)) {
        saved.current = true;
        void attachStagedPhotos(d.id, d.photos.map((ph) => ph.id))
          .then(() => saveNewProduct(d))
          .then(() => kvSet(key, null))
          .then(() => toast('Unsaved entry kept. Find it under Leads.'));
      } else if (d) {
        if (staged.current.length) void discardPhotoBlobs(staged.current);
        void kvSet(key, null);
      }
      staged.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sameBooth, fresh]);

  useEffect(() => {
    if (!draft) return undefined;
    const t = setTimeout(() => { if (!saved.current) void kvSet(key, { draft, at: Date.now() } satisfies StoredDraft); }, 600);
    return () => clearTimeout(t);
  }, [draft, key]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden' && draftRef.current && !saved.current) {
        void kvSet(key, { draft: draftRef.current, at: Date.now() } satisfies StoredDraft);
      }
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); };
  }, [key]);

  /** Saves the draft as a product. `finalize` may adjust it right before writing. */
  const save = useCallback(async (finalize?: (p: Product) => Product): Promise<Product> => {
    let p = draftRef.current;
    if (!p) throw new Error('Nothing to save.');
    if (finalize) p = finalize(p);
    await attachStagedPhotos(p.id, p.photos.map((ph) => ph.id));
    await saveNewProduct(p);
    saved.current = true;
    await kvSet(key, null);
    tap(true);
    return p;
  }, [key]);

  const restart = useCallback(async () => {
    if (staged.current.length) await discardPhotoBlobs(staged.current);
    staged.current = [];
    await kvSet(key, null);
    setDraft(await newCaptureProduct());
    setRestored(false);
  }, [key, setDraft]);

  return { draft, draftRef, patch, update, setDraft, busy, restored, onFile, setPhoto, removePhoto, save, restart };
}
