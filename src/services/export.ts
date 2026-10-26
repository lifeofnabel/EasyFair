import { CATEGORY_MAP } from '../constants/categories';
import { INCOTERMS, PAYMENTS, SUPPLIER_TYPES, CERTS, RED_FLAGS, bestTierPrice, isSalesChance } from '../constants/stand';
import { PROJECTS, labelOf } from '../constants/options';
import type { Fair, Product } from '../types/models';
import { localDate } from './followup';

const yn = (v: boolean | undefined | null) => (v === undefined || v === null ? '' : v ? 'yes' : 'no');

const COLUMNS: [string, (p: Product, fairs: Fair[]) => string | number | undefined][] = [
  ['Created', (p) => p.createdAt],
  ['Day', (p) => localDate(p.createdAt)],
  ['Fair', (p, f) => f.find((x) => x.id === p.fairId)?.name],
  ['Hall', (p) => p.hall],
  ['Booth', (p) => p.supplier.boothNumber],
  ['Company', (p) => p.supplier.company],
  ['Contact', (p) => p.supplier.contactPerson],
  ['Position', (p) => p.supplier.position],
  ['WeChat', (p) => p.supplier.wechat],
  ['Email', (p) => p.supplier.email],
  ['Phone', (p) => p.supplier.phone],
  ['WhatsApp', (p) => p.supplier.whatsapp],
  ['Website', (p) => p.supplier.website],
  ['Product', (p) => p.name],
  ['Description', (p) => p.description],
  ['Category', (p) => (p.categoryId ? CATEGORY_MAP[p.categoryId].label : '')],
  ['Tags', (p) => p.projects.map((id) => labelOf(PROJECTS, id)).join(' | ')],
  ['Priority', (p) => p.priority ?? ''],
  ['Interest', (p) => p.interest || ''],
  ['Supplier type', (p) => labelOf(SUPPLIER_TYPES, p.stand.supplierType)],
  ['Certificates', (p) => (p.stand.certs ?? []).map((c) => labelOf(CERTS, c)).join(' | ')],
  ['MOQ', (p) => p.pricing.moq],
  ['MOQ unit', (p) => p.stand.moqUnit],
  ['Currency', (p) => p.pricing.currency],
  ['Price (best tier)', (p) => p.pricing.supplierPrice ?? bestTierPrice(p.stand)],
  ['Price @100', (p) => p.stand.tiers?.q100],
  ['Price @500', (p) => p.stand.tiers?.q500],
  ['Price @1000', (p) => p.stand.tiers?.q1000],
  ['Samples', (p) => yn(p.stand.sample?.available)],
  ['Sample cost', (p) => p.stand.sample?.cost],
  ['Sample refunded', (p) => yn(p.stand.sample?.refunded)],
  ['Lead time (days)', (p) => p.stand.leadTimeDays],
  ['Payment', (p) => labelOf(PAYMENTS, p.stand.payment)],
  ['Incoterm', (p) => labelOf(INCOTERMS, p.stand.incoterm)],
  ['DE distributor', (p) => p.stand.deDistributor],
  ['Sales chance', (p) => (isSalesChance(p) ? 'yes' : '')],
  ['Red flags', (p) => p.redFlags.map((f) => labelOf(RED_FLAGS, f)).join(' | ')],
  ['Follow-up sent', (p) => p.followUpSentAt ?? ''],
  ['Note', (p) => p.notes],
];

function cell(v: string | number | undefined): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Excel-friendly CSV (UTF-8 with BOM, comma separated). */
export function leadsToCsv(products: Product[], fairs: Fair[] = []): string {
  const head = COLUMNS.map(([h]) => h).join(',');
  const rows = products.map((p) => COLUMNS.map(([, get]) => cell(get(p, fairs))).join(','));
  return `﻿${[head, ...rows].join('\r\n')}\r\n`;
}

export function leadsToJson(products: Product[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: products.length, leads: products.map((p) => ({ ...p, photos: p.photos.map(({ id, kind, infoType, remote }) => ({ id, kind, infoType, url: remote?.url })) })) }, null, 2);
}

export const csvBlob = (products: Product[], fairs: Fair[]) => new Blob([leadsToCsv(products, fairs)], { type: 'text/csv;charset=utf-8' });
export const jsonBlob = (products: Product[]) => new Blob([leadsToJson(products)], { type: 'application/json' });
