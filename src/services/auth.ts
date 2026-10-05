import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { firebaseEnabled, getFirebase } from './firebase';
import { session } from './session';

/**
 * Login = existing Jajehelp phone login. Access requires the Jajehelp custom claim admin:true,
 * exactly like the main site. No separate registration exists.
 */

const ERRORS: Record<string, string> = {
  'auth/invalid-phone-number': 'This phone number is not valid. Use the format +49 151 ...',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
  'auth/invalid-verification-code': 'The code is wrong. Check the SMS and try again.',
  'auth/code-expired': 'The code expired. Request a new one.',
  'auth/network-request-failed': 'No connection. Login needs internet once; afterwards the app works offline.',
  'auth/captcha-check-failed': 'Security check failed. Reload the page and try again.',
};

export const authErrorText = (err: unknown) =>
  ERRORS[(err as { code?: string })?.code ?? ''] ?? 'Login failed. Please try again.';

export class NoAccessError extends Error {
  constructor(public uid: string) {
    super('This account has no access to the Messe Organizer.');
  }
}

export async function watchAuth(): Promise<void> {
  if (!firebaseEnabled()) return;
  const { auth, fa } = await getFirebase();
  fa.onAuthStateChanged(auth, async (user) => {
    if (!user) {
      session.set({ status: 'signed_out', uid: null, label: '' });
      return;
    }
    const token = await user.getIdTokenResult().catch(() => null);
    if (token?.claims.admin !== true) {
      // Offline start: token can't refresh, but a cached admin user is still the owner.
      if (!token && !navigator.onLine) {
        session.set({ status: 'signed_in', uid: user.uid, label: user.phoneNumber ?? '' });
        return;
      }
      await fa.signOut(auth).catch(() => {});
      session.set({ status: 'signed_out', uid: null, label: '' });
      return;
    }
    session.set({ status: 'signed_in', uid: user.uid, label: user.phoneNumber ?? '' });
  });
}

let verifier: RecaptchaVerifier | null = null;

/** A reCAPTCHA widget can only render once per element, so every attempt gets a fresh container. */
function freshContainer(containerId: string) {
  try { verifier?.clear(); } catch { /* already gone */ }
  verifier = null;
  const old = document.getElementById(containerId);
  const el = document.createElement('div');
  el.id = containerId;
  old?.remove();
  document.body.append(el);
}

export async function sendCode(phone: string, containerId: string): Promise<ConfirmationResult> {
  const { auth, fa } = await getFirebase();
  auth.languageCode = 'en';
  freshContainer(containerId);
  verifier = new fa.RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return fa.signInWithPhoneNumber(auth, phone, verifier);
}

export async function confirmCode(confirmation: ConfirmationResult, code: string): Promise<void> {
  const { auth, fa } = await getFirebase();
  const cred = await confirmation.confirm(code);
  const token = await cred.user.getIdTokenResult(true);
  if (token.claims.admin !== true) {
    const uid = cred.user.uid;
    await fa.signOut(auth);
    throw new NoAccessError(uid);
  }
}

export async function signOut(): Promise<void> {
  const { auth, fa } = await getFirebase();
  await fa.signOut(auth);
}
