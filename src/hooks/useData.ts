import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Fair, Product } from '../types/models';

export function useProducts(): Product[] | undefined {
  return useLiveQuery(() => db.products.orderBy('createdAt').reverse().toArray(), []);
}

export function useProduct(id: string | undefined): Product | undefined | null {
  return useLiveQuery(async () => (id ? (await db.products.get(id)) ?? null : null), [id]);
}

export function useFairs(): Fair[] | undefined {
  return useLiveQuery(() => db.fairs.orderBy('startDate').toArray(), []);
}
