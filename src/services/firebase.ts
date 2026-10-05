import { FIREBASE_MODE, firebaseConfig } from '../config/app';

/**
 * Lazy Firebase. Loaded only when Firebase is enabled, so local mode never downloads the SDK.
 * Same project and same origin (jajehelp.com) as the Jajehelp site: an existing login is shared.
 */
let ready: Promise<FirebaseHandles> | null = null;

export interface FirebaseHandles {
  auth: import('firebase/auth').Auth;
  fa: typeof import('firebase/auth');
  db: import('firebase/firestore').Firestore;
  fs: typeof import('firebase/firestore');
}

export function firebaseEnabled(): boolean {
  return FIREBASE_MODE !== 'off';
}

export function getFirebase(): Promise<FirebaseHandles> {
  if (!firebaseEnabled()) return Promise.reject(new Error('Firebase is off (local mode).'));
  ready ??= (async () => {
    const [{ initializeApp }, fa, fs] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = fa.getAuth(app);
    // IndexedDB holds our offline data, so Firestore can stay in memory.
    const db = fs.initializeFirestore(app, { ignoreUndefinedProperties: true, localCache: fs.memoryLocalCache() });
    if (FIREBASE_MODE === 'emulator') {
      fa.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fs.connectFirestoreEmulator(db, '127.0.0.1', 8085);
      auth.settings.appVerificationDisabledForTesting = true;
    }
    return { auth, fa, db, fs };
  })();
  return ready;
}
