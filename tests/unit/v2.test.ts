import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/db/db';
import { blankProduct, deleteProductForever, saveNewProduct } from '../../src/db/repo';
import { createDeepseekProvider } from '../../src/services/ai/deepseek';
import { parseVoiceNote } from '../../src/services/ai/rules';
import { AiError } from '../../src/services/ai/types';
import { jpegToPdf } from '../../src/services/pdf';

const reply = (content: string | null, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }), { status });

const capture = {
  title: 'Sauce dispenser', description: 'Automatic dispenser for sauces.', categoryId: 'food', typeAnswer: 'industrial_gastro_equipment',
  targetMarkets: ['DE'], otherCountries: [], businessType: 'B2B', projects: ['babel'], purposes: [], seasons: [],
  priceAmount: 500, priceCurrency: 'EUR', moq: null, oem: null, interest: null, supplierCompany: null,
};

describe('voice note rules (offline fallback)', () => {
  it('writes a description from what was said', () => {
    const s = parseVoiceNote('Automatischer Soßenspender, interessant für Babel.   B2B');
    expect(s.description).toBe('Automatischer Soßenspender, interessant für Babel. B2B');
    expect(s.name).toBe('Automatischer Soßenspender');
  });
  it('caps long notes', () => {
    expect(parseVoiceNote('x '.repeat(400)).description!.length).toBeLessThanOrEqual(280);
  });
});

describe('DeepSeek provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends JSON mode with thinking off and maps title, description and fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(JSON.stringify(capture)));
    vi.stubGlobal('fetch', fetchMock);
    const p = createDeepseekProvider('sk-test-key-1234', 'deepseek-flash');
    const s = await p.structureCapture({ transcript: 'Soßenspender für Babel, 500 Euro' });
    expect(s).toMatchObject({ name: 'Sauce dispenser', description: 'Automatic dispenser for sauces.', categoryId: 'food', price: { amount: 500, currency: 'EUR' } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(init.headers.Authorization).toBe('Bearer sk-test-key-1234');
    expect(body.messages[1].content[0].text).toContain('Soßenspender');
  });

  it('retries once when DeepSeek returns empty content', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply('')).mockResolvedValueOnce(reply(JSON.stringify(capture)));
    vi.stubGlobal('fetch', fetchMock);
    const s = await createDeepseekProvider('sk-test-key-1234', 'deepseek-flash').structureCapture({ transcript: 'x' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(s.name).toBe('Sauce dispenser');
  });

  it('gives friendly errors for a bad key and an empty balance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    const p = createDeepseekProvider('bad', 'deepseek-flash');
    await expect(p.structureCapture({ transcript: 'x' })).rejects.toThrow('key was rejected');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 402 })));
    await expect(p.structureCapture({ transcript: 'x' })).rejects.toBeInstanceOf(AiError);
  });

  it('translates in order and in chunks', async () => {
    const strings = Array.from({ length: 120 }, (_, i) => `String ${i}`);
    const fetchMock = vi.fn().mockImplementation(async (_u: string, init: { body: string }) => {
      const input = JSON.parse(init.body).messages[1].content[0].text.match(/\[.*\]/s)![0];
      return reply(JSON.stringify({ translations: (JSON.parse(input) as string[]).map((x) => `AR:${x}`) }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const out = await createDeepseekProvider('sk-test-key-1234', 'deepseek-flash').translate(strings);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(out[0]).toBe('AR:String 0');
    expect(out[119]).toBe('AR:String 119');
  });
});

describe('delete forever', () => {
  beforeEach(async () => { await Promise.all([db.products.clear(), db.sync.clear(), db.kv.clear(), db.photoBlobs.clear()]); });

  it('removes product and photos; synced products leave a tombstone for Firebase', async () => {
    const synced = await saveNewProduct({ ...blankProduct('uid-1'), name: 'Synced' });
    await db.sync.put({ id: synced.id, dirty: 0, lastSyncedAt: '2026-10-19T10:00:00.000Z' });
    await db.photoBlobs.put({ id: 'ph1', productId: synced.id, low: new Blob(['x']) });
    await deleteProductForever(synced.id);
    expect(await db.products.get(synced.id)).toBeUndefined();
    expect(await db.photoBlobs.get('ph1')).toBeUndefined();
    expect((await db.kv.get('pendingDeletes'))?.value).toEqual([synced.id]);

    const local = await saveNewProduct({ ...blankProduct('local'), name: 'Never synced' });
    await deleteProductForever(local.id);
    expect(await db.products.get(local.id)).toBeUndefined();
    expect((await db.kv.get('pendingDeletes'))?.value).toEqual([synced.id]);
  });

  it('older records without description read back with an empty one', async () => {
    const p = blankProduct('local');
    const { description: _d, ...legacy } = p;
    await db.products.put(legacy as never);
    expect((await db.products.get(p.id))?.description).toBe('');
  });
});

describe('PDF writer', () => {
  it('produces a valid single-page PDF whose xref offsets point at the objects', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const blob = jpegToPdf(jpeg, 100, 141);
    const text = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const xref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(5);
    offsets.forEach((o, i) => expect(text.slice(o, o + 8)).toBe(`${i + 1} 0 obj\n`));
    expect(blob.type).toBe('application/pdf');
  });
});
