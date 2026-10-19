import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { collection, doc, getDoc, getDocs, query, setDoc, deleteDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const product = (id: string, ownerId: string) => ({ id, ownerId, updatedAt: '2026-10-05T10:00:00.000Z', name: 'x', photos: [], history: [] });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-jajehelp',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const owner = () => env.authenticatedContext('owner', { admin: true }).firestore();
const otherAdmin = () => env.authenticatedContext('other', { admin: true }).firestore();
const noClaim = () => env.authenticatedContext('stranger').firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('messeProducts', () => {
  it('owner (admin claim) can create, read, query and update own products', async () => {
    const db = owner();
    await assertSucceeds(setDoc(doc(db, 'messeProducts', 'p1'), product('p1', 'owner')));
    await assertSucceeds(getDoc(doc(db, 'messeProducts', 'p1')));
    await assertSucceeds(getDocs(query(collection(db, 'messeProducts'), where('ownerId', '==', 'owner'))));
    await assertSucceeds(setDoc(doc(db, 'messeProducts', 'p1'), { ...product('p1', 'owner'), name: 'edited' }));
  });

  it('unauthenticated users and accounts without the admin claim get nothing', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'messeProducts', 'p1'), product('p1', 'owner')); });
    await assertFails(getDoc(doc(anon(), 'messeProducts', 'p1')));
    await assertFails(getDoc(doc(noClaim(), 'messeProducts', 'p1')));
    await assertFails(setDoc(doc(noClaim(), 'messeProducts', 'p2'), product('p2', 'stranger')));
  });

  it('another admin cannot read or take over foreign products', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'messeProducts', 'p1'), product('p1', 'owner')); });
    await assertFails(getDoc(doc(otherAdmin(), 'messeProducts', 'p1')));
    await assertFails(setDoc(doc(otherAdmin(), 'messeProducts', 'p1'), product('p1', 'other')));
    await assertFails(getDocs(collection(otherAdmin(), 'messeProducts')));
  });

  it('owner may delete own product only; no spoofed owner, id must match', async () => {
    const db = owner();
    await assertSucceeds(setDoc(doc(db, 'messeProducts', 'p1'), product('p1', 'owner')));
    await assertFails(deleteDoc(doc(otherAdmin(), 'messeProducts', 'p1')));
    await assertFails(deleteDoc(doc(noClaim(), 'messeProducts', 'p1')));
    await assertSucceeds(deleteDoc(doc(db, 'messeProducts', 'p1')));
    await assertSucceeds(deleteDoc(doc(db, 'messeProducts', 'never-existed')));
    await assertFails(setDoc(doc(db, 'messeProducts', 'p3'), product('p3', 'someone-else')));
    await assertFails(setDoc(doc(db, 'messeProducts', 'p4'), product('wrong-id', 'owner')));
  });
});

describe('messeSettings and existing Jajehelp data', () => {
  it('settings are private to the uid', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'messeSettings', 'owner'), { ownerId: 'owner', anthropicApiKey: 'sk-test' }));
    await assertFails(getDoc(doc(otherAdmin(), 'messeSettings', 'owner')));
    await assertFails(setDoc(doc(owner(), 'messeSettings', 'other'), { ownerId: 'owner' }));
  });

  it('existing Jajehelp collections behave exactly as before', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'os', 'desktop')));
    await assertFails(setDoc(doc(owner(), 'os', 'desktop'), { items: [] }));
    await assertFails(getDoc(doc(owner(), 'somethingElse', 'x')));
  });
});
