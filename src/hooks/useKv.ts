import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useRef } from 'react';
import { db, kvSet } from '../db/db';

/** Small persisted value (favourites, ticked plan items, ...). Lives in IndexedDB, works offline, updates live. */
export function useKv<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const stored = useLiveQuery(async () => (await db.kv.get(key))?.value as T | undefined, [key]);
  const value = stored === undefined ? fallback : stored;
  const latest = useRef(value);
  latest.current = value;
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const v = typeof next === 'function' ? (next as (p: T) => T)(latest.current) : next;
    latest.current = v;
    void kvSet(key, v);
  }, [key]);
  return [value, set];
}
