import type {
  CertId, DeDistributor, Incoterm, PaymentId, Priority, Product, RedFlagId, StandData, SupplierType,
} from '../types/models';
import type { Option } from './options';

export const PRIORITIES: Option<Priority>[] = [
  { id: 'A', label: 'A', hint: 'Unbedingt' },
  { id: 'B', label: 'B', hint: 'Wenn Zeit' },
  { id: 'C', label: 'C', hint: 'Optional' },
];

export const SUPPLIER_TYPES: Option<SupplierType>[] = [
  { id: 'factory', label: 'Factory', icon: '🏭' },
  { id: 'trading', label: 'Trading', icon: '🧾' },
  { id: 'both', label: 'Both', icon: '🔀' },
];

export const CERTS: Option<CertId>[] = [
  { id: 'CE', label: 'CE' },
  { id: 'ROHS', label: 'RoHS' },
  { id: 'RED', label: 'RED', hint: 'Bei Funk: NFC, WLAN, Bluetooth' },
  { id: 'NONE', label: 'None' },
];

export const MOQ_UNITS = ['pcs', 'sets', 'rolls', 'm', 'kg'] as const;

export const PAYMENTS: Option<PaymentId>[] = [
  { id: 'TT_30_70', label: 'T/T 30/70', hint: '30 % Anzahlung, 70 % vor Versand (Standard)' },
  { id: 'TT_50_50', label: 'T/T 50/50' },
  { id: 'TT_100', label: 'T/T 100 %' },
  { id: 'LC', label: 'L/C' },
  { id: 'OTHER', label: 'Other' },
];

export const INCOTERMS: Option<Incoterm>[] = [
  { id: 'FOB', label: 'FOB Shenzhen', hint: 'Ware bis aufs Schiff in China. Fracht und Zoll zahlst du.' },
  { id: 'EXW', label: 'EXW', hint: 'Ab Fabrik. Du organisierst alles.' },
  { id: 'DDP', label: 'DDP', hint: 'Bis zur Tür in DE, verzollt. Bequem, aber teurer.' },
  { id: 'CIF', label: 'CIF' },
  { id: 'OTHER', label: 'Other' },
];

export const DE_DISTRIBUTOR: Option<DeDistributor>[] = [
  { id: 'no', label: 'No', icon: '🚀' },
  { id: 'yes', label: 'Yes' },
  { id: 'unknown', label: 'Unknown' },
];

export const RED_FLAGS: Option<RedFlagId>[] = [
  { id: 'private_account', label: 'Payment to a private account' },
  { id: 'no_cert_proof', label: '"CE is no problem" without proof' },
  { id: 'time_pressure', label: '"Only today this price"' },
  { id: 'no_company', label: 'No company name, only WeChat' },
];

export const LEAD_TIME_QUICK = [7, 15, 30, 45, 60];

export interface StandStep {
  n: number;
  id: string;
  title: string;
  /** Short coaching hint (German), shown behind the "?" */
  hint: string;
  /** Phrase card (中文) that matches this question. */
  phraseId: string;
}

export const STAND_STEPS: StandStep[] = [
  { n: 1, id: 'type', title: 'Factory or trading company?', phraseId: 'factory',
    hint: 'Fabrik = bessere Preise. Händler = kleinere Mengen, oft flexibler.' },
  { n: 2, id: 'product', title: 'Product + certificates', phraseId: 'ce',
    hint: 'CE, RoHS, bei Funk/NFC auch RED. „CE machen wir“ ohne Nachweis ist eine Red Flag. Datenblatt auf Englisch?' },
  { n: 3, id: 'moq', title: 'MOQ', phraseId: 'moq',
    hint: 'Mindestmenge. Frag auch nach der Mindestmenge für Muster.' },
  { n: 4, id: 'price', title: 'Price tiers', phraseId: 'price1000',
    hint: 'Immer für 100 / 500 / 1.000 fragen. Der erste Preis ist nie der letzte. Budget nie nennen.' },
  { n: 5, id: 'samples', title: 'Samples', phraseId: 'samples',
    hint: 'Kosten? Bei Erstbestellung erstattet? Muster = guter Test, wie ernst der Stand ist.' },
  { n: 6, id: 'lead', title: 'Lead time', phraseId: 'lead',
    hint: 'Produktion und Versand getrennt fragen. Tage, nicht „bald“.' },
  { n: 7, id: 'terms', title: 'Payment & incoterm', phraseId: 'payment',
    hint: 'T/T 30/70 ist Standard. Nichts bezahlen oder unterschreiben am Stand. Zahlung nur auf Firmenkonto.' },
  { n: 8, id: 'dist', title: 'Distributor in Germany?', phraseId: 'distributor',
    hint: 'Antwort „Nein“ = Vertriebs-Chance. Exklusivität für DE erst nach einer Testbestellung verhandeln.' },
];

export const STAND_BANNER = 'Max. 10 Min pro Stand · Erst fragen, dann entscheiden';
export const STAND_LIMIT_SEC = 10 * 60;

/** True when the lead has a German sales opportunity (vendor has no distributor in Germany yet). */
export const isSalesChance = (p: Pick<Product, 'stand'>) => p.stand?.deDistributor === 'no';

export function bestTierPrice(s: StandData): number | undefined {
  return s.tiers?.q1000 ?? s.tiers?.q500 ?? s.tiers?.q100;
}

/** Anything entered in the stand conversation (used to decide if an unfinished draft is worth keeping). */
export function hasStandAnswers(s: StandData): boolean {
  return Boolean(
    s.supplierType || s.certs?.length || s.tiers?.q100 || s.tiers?.q500 || s.tiers?.q1000 || s.sample
    || s.leadTimeDays || s.payment || s.incoterm || s.deDistributor,
  );
}
