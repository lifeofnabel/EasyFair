import { pruneAnswers } from '../constants/categories';
import { db, kvGet, kvSet } from './db';
import { newId, nowIso } from '../services/ids';
import { processImage } from '../services/images';
import type {
  HistoryAction, InfoType, Photo, PhotoKind, Product, Supplier,
} from '../types/models';
import { currentOwner } from '../services/session';

export const EMPTY_SUPPLIER: Supplier = {
  company: '', contactPerson: '', position: '', phone: '', whatsapp: '', wechat: '', email: '', website: '', address: '', boothNumber: '',
};

export function blankProduct(ownerId: string): Product {
  const now = nowIso();
  return {
    id: newId(), ownerId, createdAt: now, updatedAt: now, archivedAt: null,
    name: '', notes: '', voiceTranscript: '',
    categoryId: null, categoryAnswers: {},
    targetMarkets: [], otherCountries: [], businessType: null, seasons: [], purposes: [], projects: [], investors: [],
    interest: 0, needsReview: true,
    supplier: { ...EMPTY_SUPPLIER }, fairId: null, hall: '',
    pricing: { currency: 'EUR', note: '' },
    regulatory: { risk: 'unknown', topics: [], note: '' },
    oem: null,
    ai: {}, photos: [], history: [{ at: now, action: 'created' }],
  };
}

/** Keeps history tiny: repeated edits on the same day collapse into one entry. */
export function addHistory(history: Product['history'], action: HistoryAction, at = nowIso()): Product['history'] {
  const last = history[history.length - 1];
  if (last && last.action === action && last.at.slice(0, 10) === at.slice(0, 10)) {
    return [...history.slice(0, -1), { at, action }];
  }
  return [...history, { at, action }].slice(-30);
}

async function markDirty(id: string) {
  await db.sync.put({ id, dirty: 1 });
}

export async function saveNewProduct(product: Product): Promise<Product> {
  const p = { ...product, categoryAnswers: pruneAnswers(product.categoryId, product.categoryAnswers) };
  await db.transaction('rw', db.products, db.sync, async () => {
    await db.products.put(p);
    await markDirty(p.id);
  });
  await rememberDefaults(p);
  return p;
}

export async function updateProduct(
  id: string,
  patch: Partial<Product> | ((p: Product) => Partial<Product>),
  action: HistoryAction = 'edited',
): Promise<Product> {
  return db.transaction('rw', db.products, db.sync, async () => {
    const current = await db.products.get(id);
    if (!current) throw new Error('Product not found.');
    const changes = typeof patch === 'function' ? patch(current) : patch;
    const now = nowIso();
    const next: Product = { ...current, ...changes, updatedAt: now };
    next.categoryAnswers = pruneAnswers(next.categoryId, next.categoryAnswers);
    next.history = addHistory(current.history, action, now);
    await db.products.put(next);
    await markDirty(id);
    return next;
  });
}

export const archiveProduct = (id: string) => updateProduct(id, { archivedAt: nowIso() }, 'archived');
export const restoreProduct = (id: string) => updateProduct(id, { archivedAt: null }, 'restored');

export async function addPhoto(productId: string, file: Blob, kind: PhotoKind, infoType?: InfoType): Promise<Photo> {
  const img = await processImage(file);
  const photo: Photo = {
    id: newId(), kind, infoType, createdAt: nowIso(), width: img.width, height: img.height, uploadState: 'local',
  };
  await db.photoBlobs.put({ id: photo.id, productId, low: img.low, high: img.high });
  return photo;
}

/** Photo captured before the product exists (capture wizard). Blob is stored right away so nothing is lost. */
export async function stagePhoto(file: Blob, kind: PhotoKind, infoType?: InfoType): Promise<Photo> {
  return addPhoto('staged', file, kind, infoType);
}

export async function attachStagedPhotos(productId: string, photoIds: string[]): Promise<void> {
  await db.photoBlobs.where('id').anyOf(photoIds).modify({ productId });
}

export async function discardPhotoBlobs(photoIds: string[]): Promise<void> {
  await db.photoBlobs.bulkDelete(photoIds);
}

export async function removePhoto(productId: string, photoId: string): Promise<void> {
  await updateProduct(productId, (p) => ({ photos: p.photos.filter((ph) => ph.id !== photoId) }));
  await db.photoBlobs.delete(photoId);
}

/** Last used answers, pre-selected for the next capture ("vorgewählt"). */
export interface CaptureDefaults {
  targetMarkets: Product['targetMarkets'];
  businessType: Product['businessType'];
  projects: Product['projects'];
  categoryId: Product['categoryId'];
}

const DEFAULTS_KEY = 'captureDefaults';

async function rememberDefaults(p: Product) {
  await kvSet<CaptureDefaults>(DEFAULTS_KEY, {
    targetMarkets: p.targetMarkets, businessType: p.businessType, projects: p.projects, categoryId: p.categoryId,
  });
}

export const getCaptureDefaults = () =>
  kvGet<CaptureDefaults>(DEFAULTS_KEY, { targetMarkets: ['DE'], businessType: null, projects: [], categoryId: null });

export async function newCaptureProduct(opts: { sameBoothAs?: Product } = {}): Promise<Product> {
  const [defaults, session] = await Promise.all([getCaptureDefaults(), kvGet('fairSession', { fairId: null, hall: '' })]);
  const p = blankProduct(currentOwner());
  p.targetMarkets = defaults.targetMarkets;
  p.businessType = defaults.businessType;
  p.projects = defaults.projects;
  p.fairId = session.fairId;
  p.hall = session.hall;
  const src = opts.sameBoothAs;
  if (src) {
    p.supplier = { ...src.supplier };
    p.fairId = src.fairId;
    p.hall = src.hall;
    p.categoryId = src.categoryId;
  }
  return p;
}
