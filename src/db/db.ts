import Dexie, { type Table } from 'dexie';
import type { Fair, PhotoBlob, Product, SyncMeta } from '../types/models';

export interface KvRow {
  key: string;
  value: unknown;
}

/** Cached Arabic translation of one English UI/content string, so repeat views work offline. */
export interface TranslationRow {
  src: string;
  ar: string;
}

/** Offline-first source of truth. Firestore is a mirror that is synced in the background. */
class MesseDb extends Dexie {
  products!: Table<Product, string>;
  photoBlobs!: Table<PhotoBlob, string>;
  sync!: Table<SyncMeta, string>;
  fairs!: Table<Fair, string>;
  kv!: Table<KvRow, string>;
  translations!: Table<TranslationRow, string>;

  constructor() {
    super('jajehelp-messe');
    this.version(1).stores({
      products: 'id, updatedAt, createdAt, archivedAt, categoryId, fairId, interest',
      photoBlobs: 'id, productId',
      sync: 'id, dirty',
      fairs: 'id, startDate',
      kv: 'key',
    });
    this.version(2).stores({ translations: 'src' });
  }
}

export const db = new MesseDb();

// Records written before a field existed read back with a safe default.
db.products.hook('reading', (p) => (p && p.description === undefined ? { ...p, description: '' } : p));

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}
