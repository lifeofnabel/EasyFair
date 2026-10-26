import { FAIR_DAYS } from '../constants/guide';
import type { Product } from '../types/models';

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in the phone's local time zone (in Shenzhen: China time). */
export function localDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 0 = before the fair, 1..3 = fair day, 4 = after the fair. */
export function fairDayNumber(now = new Date()): 0 | 1 | 2 | 3 | 4 {
  const today = localDate(now);
  if (today < FAIR_DAYS[0].date) return 0;
  const hit = FAIR_DAYS.find((d) => d.date === today);
  if (hit) return hit.day;
  return 4;
}

/** Which timeline day to show first: today if it is a fair day, else the nearest one. */
export function planDay(now = new Date()): 1 | 2 | 3 {
  const n = fairDayNumber(now);
  return n === 0 ? 1 : n === 4 ? 3 : n;
}

export const isLead = (p: Product) => !p.archivedAt;

/** Open follow-up = rated A or B and no message sent yet. C is optional. */
export const isOpenFollowUp = (p: Product) => !p.archivedAt && (p.priority === 'A' || p.priority === 'B') && !p.followUpSentAt;

export interface DayStats {
  leads: number;
  aLeads: number;
  open: number;
  unrated: number;
}

/** "Heute: X Leads, Y A-Leads, Z offen" */
export function dayStats(products: Product[], now = new Date()): DayStats {
  const today = localDate(now);
  const active = products.filter(isLead);
  const todays = active.filter((p) => localDate(p.createdAt) === today);
  return {
    leads: todays.length,
    aLeads: todays.filter((p) => p.priority === 'A').length,
    open: active.filter(isOpenFollowUp).length,
    unrated: todays.filter((p) => !p.priority).length,
  };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Ready-to-send WeChat message, filled with contact, hall and booth. */
export function followUpText(p: Product, now = new Date()): string {
  const s = p.supplier;
  const who = firstName(s.contactPerson) || (s.company ? `${s.company} team` : '');
  const sameDay = localDate(p.createdAt) === localDate(now);
  const hall = p.hall.trim();
  const booth = s.boothNumber.trim();
  const where = hall ? `, Hall ${hall}${booth ? ` (booth ${booth})` : ''}` : booth ? `, booth ${booth}` : '';
  return `Hi${who ? ` ${who}` : ''}, this is Nabil from Frankfurt, we met ${sameDay ? 'today ' : ''}at NEPCON${where}. `
    + 'Thank you for your time! Could you please send the quotation and product catalogue to hello@jajehelp.com? '
    + 'Looking forward to working together.';
}
