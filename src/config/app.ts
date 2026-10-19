/** Central app identity. Rename the product here only. */
export const APP = {
  name: 'EasyFair',
  fullName: 'EasyFair',
  brand: 'jajehelp',
} as const;

/** Firestore namespaces. Everything this app writes lives under these and nowhere else. */
export const COLLECTIONS = {
  products: 'messeProducts',
  fairs: 'messeFairs',
  settings: 'messeSettings',
} as const;

export type FirebaseMode = 'off' | 'emulator' | 'live';
// Dev server: local-only unless a mode is set. Production build: the real Jajehelp project.
export const FIREBASE_MODE = (import.meta.env.VITE_FIREBASE_MODE ?? (import.meta.env.PROD ? 'live' : 'off')) as FirebaseMode;

export const firebaseConfig = {
  // Public web config of jajehelp37 (same as jajehelp/public/js/config.js). Not a secret.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDyqydPYlcULwAUy6OY5sVyscjxQF8WJlg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'jajehelp37.firebaseapp.com',
  projectId: FIREBASE_MODE === 'emulator' ? 'demo-jajehelp' : (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'jajehelp37'),
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:524647734105:web:04d91d6980c33cd2644a48',
};

/** Owner id used while Firebase is off (local-only mode). */
export const LOCAL_OWNER = 'local';

export const SYNC_INTERVAL_MS = 20_000;

export const IMAGE = {
  lowMaxEdge: 900,
  lowQuality: 0.6,
  highMaxEdge: 2400,
  highQuality: 0.85,
} as const;

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (cheaper)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (cheapest)' },
] as const;

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-flash', label: 'DeepSeek Flash (fast, cheap, sees images)' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro (stronger, text only)' },
] as const;
