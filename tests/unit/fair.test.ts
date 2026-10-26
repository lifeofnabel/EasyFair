import { describe, expect, it } from 'vitest';
import {
  EXHIBITORS, FAIR_DAYS, HALLS, NUMBERS, PHRASES, PITCHES, TIMELINE,
} from '../../src/constants/guide';
import { STAND_STEPS, bestTierPrice, hasStandAnswers, isSalesChance } from '../../src/constants/stand';
import { blankProduct } from '../../src/db/repo';
import { isMeaningful } from '../../src/hooks/useCaptureDraft';
import { dealRows } from '../../src/services/deal';
import { leadsToCsv, leadsToJson } from '../../src/services/export';
import { EMPTY_FILTER, filterProducts, filterToParams, hallKey, paramsToFilter } from '../../src/services/filter';
import { dayStats, fairDayNumber, followUpText, isOpenFollowUp, localDate, planDay } from '../../src/services/followup';
import type { Product } from '../../src/types/models';

const lead = (patch: Partial<Product> = {}): Product => ({ ...blankProduct('local'), ...patch });
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0);

describe('guide data', () => {
  it('phrases are complete, unique and every stand step has its phrase', () => {
    expect(new Set(PHRASES.map((p) => p.id)).size).toBe(PHRASES.length);
    for (const p of PHRASES) {
      expect(p.zh, p.id).toMatch(/[\u4e00-\u9fff]/);
      expect(p.py.length, p.id).toBeGreaterThan(3);
      expect(p.en.length, p.id).toBeGreaterThan(3);
      expect(p.de.length, p.id).toBeGreaterThan(3);
    }
    for (const s of STAND_STEPS) expect(PHRASES.some((p) => p.id === s.phraseId), s.id).toBe(true);
    expect(STAND_STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(NUMBERS.map((n) => n.n)).toEqual(expect.arrayContaining(['100', '500', '1.000', '10.000']));
  });

  it('timeline, halls, exhibitors and pitches hang together', () => {
    expect(new Set(TIMELINE.map((t) => t.id)).size).toBe(TIMELINE.length);
    for (const d of [1, 2, 3]) expect(TIMELINE.some((t) => t.day === d), `day ${d}`).toBe(true);
    for (const t of TIMELINE) expect(t.time).toMatch(/^\d\d:\d\d$/);
    expect(new Set(EXHIBITORS.map((e) => e.id)).size).toBe(EXHIBITORS.length);
    expect(EXHIBITORS.filter((e) => e.prio === 'A').length).toBeGreaterThanOrEqual(6);
    expect(HALLS.flatMap((h) => h.halls)).toEqual(expect.arrayContaining(['7', '9', '15']));
    expect(PITCHES.map((p) => p.tag)).toEqual(['hala', 'lokka', 'mts', 'robo']);
  });
});

describe('fair days', () => {
  it('knows before, during and after the fair', () => {
    expect(fairDayNumber(at(2026, 10, 26))).toBe(0);
    expect(fairDayNumber(at(2026, 10, 27, 8))).toBe(1);
    expect(fairDayNumber(at(2026, 10, 28, 23))).toBe(2);
    expect(fairDayNumber(at(2026, 10, 29))).toBe(3);
    expect(fairDayNumber(at(2026, 10, 30))).toBe(4);
    expect(planDay(at(2026, 10, 20))).toBe(1);
    expect(planDay(at(2026, 11, 3))).toBe(3);
    expect(FAIR_DAYS[0].date).toBe('2026-10-27');
  });
});

describe('follow-up', () => {
  it('fills contact, hall and booth; says "today" only on the same day', () => {
    const p = lead({ createdAt: at(2026, 10, 27).toISOString(), hall: '15', supplier: { ...blankProduct('x').supplier, company: 'Acme NFC', contactPerson: 'Lily Chen', boothNumber: 'B12' } });
    const same = followUpText(p, at(2026, 10, 27, 20));
    expect(same).toContain('Hi Lily,');
    expect(same).toContain('we met today at NEPCON, Hall 15 (booth B12).');
    expect(same).toContain('hello@jajehelp.com');
    expect(followUpText(p, at(2026, 10, 28))).toContain('we met at NEPCON');
    expect(followUpText(lead({ hall: '' }), at(2026, 10, 27))).toMatch(/^Hi, this is Nabil/);
    expect(followUpText(lead({ supplier: { ...blankProduct('x').supplier, company: 'Acme' } }))).toContain('Hi Acme team,');
  });

  it('open = A or B without a sent message; stats count today', () => {
    const today = at(2026, 10, 27, 10).toISOString();
    const list = [
      lead({ priority: 'A', createdAt: today }),
      lead({ priority: 'B', createdAt: today, followUpSentAt: today }),
      lead({ priority: 'C', createdAt: today }),
      lead({ createdAt: today }),
      lead({ priority: 'A', createdAt: at(2026, 10, 26).toISOString() }),
    ];
    expect(list.map(isOpenFollowUp)).toEqual([true, false, false, false, true]);
    expect(dayStats(list, at(2026, 10, 27, 18))).toEqual({ leads: 4, aLeads: 1, open: 2, unrated: 1 });
  });
});

describe('stand answers', () => {
  it('detects answers, sales chance and the best tier price', () => {
    expect(hasStandAnswers({})).toBe(false);
    expect(hasStandAnswers({ leadTimeDays: 30 })).toBe(true);
    expect(isSalesChance({ stand: { deDistributor: 'no' } })).toBe(true);
    expect(isSalesChance({ stand: { deDistributor: 'yes' } })).toBe(false);
    expect(bestTierPrice({ tiers: { q100: 1.2, q500: 1.0 } })).toBe(1.0);
    expect(bestTierPrice({ tiers: { q100: 1.2, q500: 1.0, q1000: 0.8 } })).toBe(0.8);
  });

  it('keeps meaningful drafts only (hall alone is not enough)', () => {
    expect(isMeaningful(lead({ hall: '15' }))).toBe(false);
    expect(isMeaningful(lead({ supplier: { ...blankProduct('x').supplier, company: 'Acme' } }))).toBe(true);
    expect(isMeaningful(lead({ stand: { deDistributor: 'no' } }))).toBe(true);
    expect(isMeaningful(lead({ priority: 'B' }))).toBe(true);
  });

  it('turns the answers into readable deal rows', () => {
    const rows = Object.fromEntries(dealRows(lead({
      pricing: { currency: 'USD', moq: 500, note: '' },
      stand: { moqUnit: 'pcs', tiers: { q100: 1.5, q1000: 0.9 }, sample: { available: true, cost: 0, refunded: true }, leadTimeDays: 25, payment: 'TT_30_70', incoterm: 'FOB', deDistributor: 'no', supplierType: 'factory', certs: ['CE', 'ROHS'] },
    })));
    expect(rows['Price (best)']).toContain('0.9');
    expect(rows.Tiers).toBe('100: 1.5 · 500: – · 1k: 0.9');
    expect(rows.MOQ).toBe('500 pcs');
    expect(rows.Samples).toBe('Free, refunded on 1st order');
    expect(rows['Lead time']).toBe('25 days');
    expect(rows.Terms).toBe('T/T 30/70 · FOB Shenzhen');
    expect(rows['DE distributor']).toContain('sales chance');
    expect(rows.Certificates).toBe('CE, RoHS');
  });
});

describe('lead filters', () => {
  const t1 = at(2026, 10, 27).toISOString();
  const t2 = at(2026, 10, 28).toISOString();
  const list = [
    lead({ name: 'NFC tag', priority: 'A', hall: 'Hall 15', createdAt: t1, projects: ['lokka'], stand: { deDistributor: 'no' } }),
    lead({ name: 'Robot', priority: 'B', hall: '7', createdAt: t2, projects: ['robo'], redFlags: ['time_pressure'], followUpSentAt: t2 }),
    lead({ name: 'Unrated', hall: '15A', createdAt: t2 }),
  ];
  it('priority, hall, day, status', () => {
    const f = (patch: Partial<typeof EMPTY_FILTER>) => filterProducts(list, { ...EMPTY_FILTER, ...patch }).map((p) => p.name);
    expect(f({ priority: 'A' })).toEqual(['NFC tag']);
    expect(f({ priority: 'none' })).toEqual(['Unrated']);
    expect(f({ hall: '15' })).toEqual(['NFC tag', 'Unrated']);
    expect(f({ day: localDate(t2) })).toEqual(['Robot', 'Unrated']);
    expect(f({ followUp: 'open' })).toEqual(['NFC tag']);
    expect(f({ followUp: 'sent' })).toEqual(['Robot']);
    expect(f({ salesChance: true })).toEqual(['NFC tag']);
    expect(f({ redFlags: true })).toEqual(['Robot']);
    expect(f({ project: 'robo' })).toEqual(['Robot']);
    expect(f({ q: 'hall 15' })).toEqual(['NFC tag']);
  });
  it('hall keys ignore wording; the new fields survive the URL', () => {
    expect(hallKey('Hall 15')).toBe('15');
    expect(hallKey('15A')).toBe('15');
    const f = { ...EMPTY_FILTER, priority: 'A' as const, hall: '15', day: '2026-10-27', followUp: 'open' as const, salesChance: true, redFlags: true };
    expect(paramsToFilter(filterToParams(f))).toEqual(f);
  });
});

describe('export', () => {
  it('writes Excel-safe CSV and complete JSON', () => {
    const p = lead({ name: 'Tag, "NTAG" 424\nDNA', priority: 'A', hall: '15', supplier: { ...blankProduct('x').supplier, company: 'Acme; Ltd', wechat: 'acme_88' }, pricing: { currency: 'USD', moq: 500, note: '' }, stand: { tiers: { q1000: 0.2 } } });
    const csv = leadsToCsv([p, lead()], []);
    expect(csv.startsWith('\uFEFFCreated,Day,Fair,Hall,Booth,Company')).toBe(true);
    expect(csv).toContain('"Tag, ""NTAG"" 424\nDNA"');
    expect(csv).toContain('"Acme; Ltd"');
    const lines = csv.trim().split('\r\n');
    expect(lines[0].split(',').length).toBeGreaterThan(30);
    const json = JSON.parse(leadsToJson([p]));
    expect(json.count).toBe(1);
    expect(json.leads[0].supplier.wechat).toBe('acme_88');
  });
});
