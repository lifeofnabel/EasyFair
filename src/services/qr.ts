
import type { ContactSuggestion } from '../types/models';
import { imageData } from './images';

export type QrResult =
  | { kind: 'url'; raw: string; url: string }
  | { kind: 'contact'; raw: string; contact: ContactSuggestion }
  | { kind: 'wechat'; raw: string; wechat: string }
  | { kind: 'whatsapp'; raw: string; whatsapp: string }
  | { kind: 'raw'; raw: string };

export async function decodeQr(blob: Blob): Promise<string | null> {
  const { default: jsQR } = await import('jsqr');
  for (const edge of [900, 1600]) {
    const data = await imageData(blob, edge);
    const hit = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
    if (hit?.data) return hit.data;
  }
  return null;
}

function vcardField(raw: string, key: string): string {
  const m = raw.match(new RegExp(`^${key}(?:;[^:\n]*)?:(.*)$`, 'im'));
  return m ? m[1].trim() : '';
}

function mecardField(raw: string, key: string): string {
  const m = raw.match(new RegExp(`${key}:([^;]*);`, 'i'));
  return m ? m[1].trim() : '';
}

export function parseQr(raw: string): QrResult {
  const text = raw.trim();
  if (/^BEGIN:VCARD/i.test(text)) {
    const n = vcardField(text, 'FN') || vcardField(text, 'N').split(';').filter(Boolean).reverse().join(' ');
    return {
      kind: 'contact', raw: text,
      contact: {
        contactPerson: n, company: vcardField(text, 'ORG').replace(/;/g, ' ').trim(), position: vcardField(text, 'TITLE'),
        phone: vcardField(text, 'TEL'), email: vcardField(text, 'EMAIL'), website: vcardField(text, 'URL'),
        address: vcardField(text, 'ADR').replace(/;+/g, ', ').replace(/^, |, $/g, ''),
      },
    };
  }
  if (/^MECARD:/i.test(text)) {
    return {
      kind: 'contact', raw: text,
      contact: {
        contactPerson: mecardField(text, 'N').replace(',', ' '), phone: mecardField(text, 'TEL'),
        email: mecardField(text, 'EMAIL'), website: mecardField(text, 'URL'), company: mecardField(text, 'ORG'),
        address: mecardField(text, 'ADR'),
      },
    };
  }
  const wechat = text.match(/^(?:weixin:\/\/[^?]*\?.*?username=|weixin:\/\/contacts\/profile\/)([\w-]+)/i)
    ?? text.match(/^https?:\/\/(?:u\.wechat\.com|weixin\.qq\.com)\/[\w/]*?([\w-]{6,})\/?$/i);
  if (wechat) return { kind: 'wechat', raw: text, wechat: wechat[1] };
  const wa = text.match(/^https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\+?(\d{6,15})/i);
  if (wa) return { kind: 'whatsapp', raw: text, whatsapp: `+${wa[1]}` };
  if (/^https?:\/\//i.test(text)) return { kind: 'url', raw: text, url: text };
  if (/^www\./i.test(text)) return { kind: 'url', raw: text, url: `https://${text}` };
  return { kind: 'raw', raw: text };
}

export function qrToContact(result: QrResult): ContactSuggestion {
  switch (result.kind) {
    case 'contact': return result.contact;
    case 'url': return { website: result.url };
    case 'wechat': return { wechat: result.wechat };
    case 'whatsapp': return { whatsapp: result.whatsapp };
    default: return {};
  }
}
