import { FIREBASE_MODE, LOCAL_OWNER } from '../config/app';
import { createStore } from './store';

export type AuthStatus = 'local' | 'loading' | 'signed_out' | 'signed_in';

export interface SessionState {
  status: AuthStatus;
  uid: string | null;
  label: string;
}

export const session = createStore<SessionState>({
  status: FIREBASE_MODE === 'off' ? 'local' : 'loading',
  uid: null,
  label: '',
});

/** Owner id for new records. Local records are re-owned to the real uid on first sync. */
export const currentOwner = (): string => session.get().uid ?? LOCAL_OWNER;
