import Dexie, { type Table } from 'dexie';
import type { Fair, PhotoBlob, Product, SyncMeta } from '../types/models';

export interface KvRow {
  key: string;
  value: unknown;
}

/** Offline-first source of truth. Firestore is a mirror that is synced in the background. */
class MesseDb extends Dexie {
  products!: Table<Product, string>;
  photoBlobs!: Table<PhotoBlob, string>;
  sync!: Table<SyncMeta, string>;
  fairs!: Table<Fair, string>;
  kv!: Table<KvRow, string>;

  constructor() {
    super('jajehelp-messe');
    this.version(1).stores({
      products: 'id, updatedAt, createdAt, archivedAt, categoryId, fairId, interest',
      photoBlobs: 'id, productId',
      sync: 'id, dirty',
      fairs: 'id, startDate',
      kv: 'key',
    });
  }
}

export const db = new MesseDb();

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}
