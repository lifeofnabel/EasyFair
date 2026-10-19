import { db } from '../db/db';
import { translateToArabic } from './ai';

/**
 * Translates what is currently on screen to Arabic: text nodes, placeholders and the text inside
 * note fields. Translations are cached in IndexedDB, so a page you translated once works offline.
 * The English DOM is restored exactly when switched off or when the page changes.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'SVG', 'TITLE']);
const HAS_LATIN = /[A-Za-zÀ-ɏ]/;
const HAS_ARABIC = /[؀-ۿ]/;
const TEXT_INPUTS = new Set(['text', '']);

interface Applied { orig: string; shown: string }

const textApplied = new Map<Text, Applied>();
const attrApplied = new Map<HTMLElement, Applied>();
const extras = new Set<HTMLElement>();
let observer: MutationObserver | null = null;
let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let rootEl: HTMLElement | null = null;
let failed: ((err: unknown) => void) | null = null;

const translatable = (s: string) => HAS_LATIN.test(s) && !HAS_ARABIC.test(s);
const wrap = (original: string, ar: string) => `${original.match(/^\s*/)![0]}${ar}${original.match(/\s*$/)![0]}`;

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase()) || e.hasAttribute('data-no-translate') || e.hasAttribute('data-ar-extra')) return true;
  }
  return false;
}

interface Targets {
  /** Neighbouring text nodes of one element (React splits `{n} product{s}` into pieces) are translated as one sentence. */
  groups: Text[][];
  placeholders: HTMLInputElement[];
  fields: (HTMLInputElement | HTMLTextAreaElement)[];
}

function collect(root: HTMLElement): Targets {
  const groups: Text[][] = [];
  let current: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    if (current.length && t.previousSibling === current[current.length - 1]) current.push(t);
    else { current = [t]; groups.push(current); }
  }
  const texts = groups.filter((g) => {
    if (skipped(g[0].parentElement)) return false;
    const joined = g.map((t) => t.nodeValue ?? '').join('');
    const unchanged = g.every((t) => { const k = textApplied.get(t); return k && k.shown === (t.nodeValue ?? ''); });
    return !unchanged && joined.trim() !== '' && translatable(joined);
  });
  const placeholders = [...root.querySelectorAll<HTMLInputElement>('input[placeholder], textarea[placeholder]')]
    .filter((el) => {
      const ph = el.getAttribute('placeholder') ?? '';
      const known = attrApplied.get(el);
      return translatable(ph) && !skipped(el) && !(known && known.shown === ph);
    });
  const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input')]
    .filter((el) => {
      if (el.tagName === 'INPUT' && !TEXT_INPUTS.has((el as HTMLInputElement).type)) return false;
      if (el.nextElementSibling?.hasAttribute('data-ar-extra')) return false;
      return el.value.trim().length > 2 && translatable(el.value) && !skipped(el);
    });
  return { groups: texts, placeholders, fields };
}

async function lookup(strings: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(strings)];
  const cached = await db.translations.bulkGet(unique);
  const result = new Map<string, string>();
  const missing: string[] = [];
  unique.forEach((s, i) => { const hit = cached[i]; if (hit) result.set(s, hit.ar); else missing.push(s); });
  if (missing.length) {
    const ar = await translateToArabic(missing);
    const rows = missing.map((src, i) => ({ src, ar: ar[i] ?? src })).filter((r) => r.ar && r.ar !== r.src);
    await db.translations.bulkPut(rows);
    rows.forEach((r) => result.set(r.src, r.ar));
  }
  return result;
}

async function run(): Promise<void> {
  if (!rootEl || applying) return;
  const { groups, placeholders, fields } = collect(rootEl);
  if (!groups.length && !placeholders.length && !fields.length) return;
  const joinedOf = (g: Text[]) => g.map((t) => t.nodeValue ?? '').join('');
  applying = true;
  try {
    const keys = [
      ...groups.map((g) => joinedOf(g).trim()),
      ...placeholders.map((p) => p.getAttribute('placeholder')!.trim()),
      ...fields.map((f) => f.value.trim()),
    ];
    const map = await lookup(keys);
    if (!rootEl) return; // switched off while waiting
    for (const g of groups) {
      const orig = joinedOf(g);
      const ar = map.get(orig.trim());
      if (!ar || !g[0].isConnected) continue;
      const shown = wrap(orig, ar);
      g.forEach((t, i) => {
        const piece = t.nodeValue ?? '';
        const next = i === 0 ? shown : '';
        t.nodeValue = next;
        textApplied.set(t, { orig: piece, shown: next });
      });
    }
    for (const p of placeholders) {
      const orig = p.getAttribute('placeholder')!;
      const ar = map.get(orig.trim());
      if (!ar) continue;
      p.setAttribute('placeholder', ar);
      attrApplied.set(p, { orig, shown: ar });
    }
    for (const f of fields) {
      const ar = map.get(f.value.trim());
      if (!ar || !f.isConnected) continue;
      const div = document.createElement('div');
      div.setAttribute('data-ar-extra', '');
      div.className = 'ar-extra';
      div.dir = 'rtl';
      div.textContent = ar;
      f.insertAdjacentElement('afterend', div);
      extras.add(div);
    }
  } catch (err) {
    failed?.(err);
  } finally {
    applying = false;
  }
}

function schedule(): void {
  clearTimeout(timer);
  timer = setTimeout(() => { void run(); }, 250);
}

export async function startPageTranslation(root: HTMLElement, onError: (err: unknown) => void): Promise<void> {
  rootEl = root;
  failed = onError;
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
  observer?.disconnect();
  observer = new MutationObserver(() => { if (!applying) schedule(); });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  await run();
}

export function stopPageTranslation(): void {
  clearTimeout(timer);
  observer?.disconnect();
  observer = null;
  rootEl = null;
  failed = null;
  for (const [node, { orig, shown }] of textApplied) if (node.isConnected && node.nodeValue === shown) node.nodeValue = orig;
  for (const [el, { orig, shown }] of attrApplied) if (el.isConnected && el.getAttribute('placeholder') === shown) el.setAttribute('placeholder', orig);
  textApplied.clear();
  attrApplied.clear();
  extras.forEach((e) => e.remove());
  extras.clear();
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
}
