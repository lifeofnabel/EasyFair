import { beforeEach, describe, expect, it } from 'vitest';
import { pruneAnswers, productType, visibleQuestions, CATEGORIES } from '../../src/constants/categories';
import { db } from '../../src/db/db';
import { addHistory, archiveProduct, blankProduct, newCaptureProduct, restoreProduct, saveNewProduct, updateProduct } from '../../src/db/repo';
import { mockProvider } from '../../src/services/ai/mock';
import { parseVoiceNote } from '../../src/services/ai/rules';
import { scoreTotal } from '../../src/services/ai';
import { applySuggestion } from '../../src/components/SuggestionReview';
import { EMPTY_FILTER, filterProducts, filterToParams, paramsToFilter } from '../../src/services/filter';
import { parseQr, qrToContact } from '../../src/services/qr';
import type { Product } from '../../src/types/models';

describe('voice note parser (offline rules)', () => {
  it('extracts the example from the brief', () => {
    const s = parseVoiceNote('Automatic sauce dispenser, interesting for Babel, maybe around 500 euros, B2B, Germany.');
    expect(s.name).toBe('Automatic sauce dispenser');
    expect(s.targetMarkets).toEqual(['DE']);
    expect(s.businessType).toBe('B2B');
    expect(s.projects).toContain('babel');
    expect(s.price).toEqual({ amount: 500, currency: 'EUR' });
    expect(s.categoryId).toBe('food');
    expect(s.categoryAnswers).toMatchObject({ type: 'industrial_gastro_equipment', equipment_kind: 'dispenser' });
  });

  it('understands German with OEM and MOQ', () => {
    const s = parseVoiceNote('Interessant für Deutschland und Babel. B2B. Ungefähr 500 Euro. Hersteller bietet OEM an, MOQ ungefähr 100 Stück.');
    expect(s.targetMarkets).toEqual(['DE']);
    expect(s.oem).toBe(true);
    expect(s.moq).toBe(100);
    expect(s.price?.amount).toBe(500);
    expect(s.name).toBeUndefined();
  });

  it('never invents a price', () => {
    const s = parseVoiceNote('Schöner Rucksack für Schulanfang, eigene Marke');
    expect(s.price).toBeUndefined();
    expect(s.seasons).toContain('back_to_school');
    expect(s.purposes).toContain('own_brand');
  });

  it('handles currencies and thousands', () => {
    expect(parseVoiceNote('ca. 12.000 RMB pro Maschine').price).toEqual({ amount: 12000, currency: 'CNY' });
    expect(parseVoiceNote('around $ 2.5 per piece').price).toEqual({ amount: 2.5, currency: 'USD' });
    expect(parseVoiceNote('about 3k euro').price).toEqual({ amount: 3000, currency: 'EUR' });
  });

  it('detects Syria and other countries', () => {
    const s = parseVoiceNote('für Syrien und Jordanien, Ramadan');
    expect(s.targetMarkets).toEqual(expect.arrayContaining(['SY', 'OTHER']));
    expect(s.otherCountries).toEqual(['Jordan']);
    expect(s.seasons).toEqual(['ramadan']);
  });
});

describe('dynamic category questions', () => {
  it('every category has a type question with options', () => {
    for (const c of CATEGORIES) {
      const q = c.questions.find((x) => x.id === c.typeQuestionId);
      expect(q?.options?.length, c.id).toBeGreaterThan(1);
    }
  });

  it('shows only matching sub-questions', () => {
    const food = visibleQuestions('food', { type: 'trading_goods' }).map((q) => q.id);
    expect(food).toContain('food_kind');
    expect(food).not.toContain('equipment_kind');
    const equip = visibleQuestions('food', { type: 'industrial_gastro_equipment' }).map((q) => q.id);
    expect(equip).toContain('equipment_kind');
    expect(equip).not.toContain('allergens');
    expect(visibleQuestions('energy', { battery: true }).map((q) => q.id)).toContain('lithium');
    expect(visibleQuestions('energy', { battery: false }).map((q) => q.id)).not.toContain('lithium');
  });

  it('prunes answers that no longer apply', () => {
    const pruned = pruneAnswers('food', { type: 'industrial_gastro_equipment', food_kind: 'snacks', equipment_kind: 'dispenser' });
    expect(pruned).toEqual({ type: 'industrial_gastro_equipment', equipment_kind: 'dispenser' });
    expect(productType('food', pruned)).toBe('Industrial / Gastro equipment');
  });
});

describe('QR parsing', () => {
  it('reads URL, WeChat, vCard and raw', () => {
    expect(parseQr('https://example.com/p/1').kind).toBe('url');
    const wc = parseQr('weixin://contacts/profile/lily_demo_88');
    expect(qrToContact(wc)).toEqual({ wechat: 'lily_demo_88' });
    const vc = parseQr('BEGIN:VCARD\nVERSION:3.0\nFN:Lily Chen\nORG:Demo Tech\nTEL;TYPE=CELL:+86 138\nEMAIL:lily@example.com\nEND:VCARD');
    expect(qrToContact(vc)).toMatchObject({ contactPerson: 'Lily Chen', company: 'Demo Tech', email: 'lily@example.com', phone: '+86 138' });
    expect(parseQr('ABC-123').kind).toBe('raw');
  });
});

const make = (patch: Partial<Product>): Product => ({ ...blankProduct('local'), ...patch });

describe('filter and search', () => {
  const list = [
    make({ name: 'Sauce dispenser', categoryId: 'food', categoryAnswers: { type: 'industrial_gastro_equipment' }, targetMarkets: ['DE'], projects: ['babel'], interest: 5 }),
    make({ name: 'Pet feeder', categoryId: 'trading', targetMarkets: ['SY'], interest: 2, supplier: { ...blankProduct('x').supplier, company: 'PetJoy', contactPerson: 'Sunny' } }),
    make({ name: 'Old idea', categoryId: 'idea', archivedAt: '2026-10-01T00:00:00.000Z' }),
  ];
  it('filters by category, type, market, project, interest', () => {
    expect(filterProducts(list, { ...EMPTY_FILTER, categoryId: 'food', type: 'industrial_gastro_equipment' })).toHaveLength(1);
    expect(filterProducts(list, { ...EMPTY_FILTER, market: 'SY' })[0].name).toBe('Pet feeder');
    expect(filterProducts(list, { ...EMPTY_FILTER, project: 'babel', minInterest: 4 })).toHaveLength(1);
  });
  it('hides archived by default', () => {
    expect(filterProducts(list, EMPTY_FILTER)).toHaveLength(2);
    expect(filterProducts(list, { ...EMPTY_FILTER, archived: 'only' })).toHaveLength(1);
  });
  it('searches company and contact', () => {
    expect(filterProducts(list, { ...EMPTY_FILTER, q: 'sunny' })).toHaveLength(1);
    expect(filterProducts(list, { ...EMPTY_FILTER, q: 'petjoy feeder' })).toHaveLength(1);
  });
  it('round-trips through the URL', () => {
    const f = { ...EMPTY_FILTER, categoryId: 'food' as const, minInterest: 4, archived: 'show' as const };
    expect(paramsToFilter(filterToParams(f))).toEqual(f);
  });
});

describe('suggestions are applied only when accepted', () => {
  it('applies accepted keys and leaves rejected ones', () => {
    const p = make({ businessType: 'B2C' });
    const next = applySuggestion(p, { businessType: 'B2B', moq: 100, price: { amount: 500, currency: 'EUR' } }, ['moq', 'price']);
    expect(next.businessType).toBe('B2C');
    expect(next.pricing.moq).toBe(100);
    expect(next.pricing.supplierPrice).toBe(500);
  });
});

describe('product repository', () => {
  beforeEach(async () => { await Promise.all([db.products.clear(), db.sync.clear(), db.kv.clear(), db.photoBlobs.clear()]); });

  it('creates with only a note, edits, archives and restores', async () => {
    const p = await saveNewProduct({ ...blankProduct('local'), voiceTranscript: 'Das könnte für Babel interessant sein.' });
    expect((await db.sync.get(p.id))?.dirty).toBe(1);
    await updateProduct(p.id, { name: 'Edited' });
    await updateProduct(p.id, { notes: 'x' });
    const archived = await archiveProduct(p.id);
    expect(archived.archivedAt).not.toBeNull();
    const restored = await restoreProduct(p.id);
    expect(restored.archivedAt).toBeNull();
    expect(restored.name).toBe('Edited');
    expect(restored.history.map((h) => h.action)).toEqual(['created', 'edited', 'archived', 'restored']);
  });

  it('pre-selects last answers for the next capture', async () => {
    await saveNewProduct({ ...blankProduct('local'), targetMarkets: ['SY'], businessType: 'B2B', projects: ['lokka'], categoryId: 'retail' });
    const next = await newCaptureProduct();
    expect(next.targetMarkets).toEqual(['SY']);
    expect(next.businessType).toBe('B2B');
    expect(next.projects).toEqual(['lokka']);
  });

  it('same booth copies the supplier', async () => {
    const src = await saveNewProduct({ ...blankProduct('local'), supplier: { ...blankProduct('x').supplier, company: 'ACME', boothNumber: '9F12' }, hall: '9' });
    const next = await newCaptureProduct({ sameBoothAs: src });
    expect(next.supplier.company).toBe('ACME');
    expect(next.hall).toBe('9');
    expect(next.id).not.toBe(src.id);
  });

  it('collapses same-day edits in history', () => {
    const h = addHistory(addHistory([{ at: '2026-10-05T08:00:00Z', action: 'created' }], 'edited', '2026-10-05T09:00:00Z'), 'edited', '2026-10-05T10:00:00Z');
    expect(h).toHaveLength(2);
  });
});

describe('mock AI', () => {
  it('produces 2 advantages, 2 disadvantages, 2-4 questions and an honest unknown price', async () => {
    const p = make({ name: 'Sauce dispenser', categoryId: 'food', projects: ['babel'] });
    const a = await mockProvider.analyzeProduct(p);
    expect(a.advantages).toHaveLength(2);
    expect(a.disadvantages).toHaveLength(2);
    expect(a.questions.length).toBeGreaterThanOrEqual(2);
    expect(a.questions.length).toBeLessThanOrEqual(4);
    expect(a.summary).toContain('Unknown');
  });
  it('scores 9 dimensions into 0-100', async () => {
    const s = await mockProvider.scoreProduct(make({ categoryId: 'trading', targetMarkets: ['DE'], interest: 4 }));
    expect(Object.keys(s.dims)).toHaveLength(9);
    const total = scoreTotal(s.dims);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
    expect(scoreTotal(Object.fromEntries(Object.keys(s.dims).map((k) => [k, 10])))).toBe(100);
  });
});
