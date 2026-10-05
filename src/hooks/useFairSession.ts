import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { FairSession } from '../types/models';

export function useFairSession(): FairSession | undefined {
  return useLiveQuery(async () => ((await db.kv.get('fairSession'))?.value as FairSession | undefined) ?? { fairId: null, hall: '' }, []);
}
