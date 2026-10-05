import type {
  BusinessType, Currency, InfoType, InvestmentType, InvestorId, MarketId, PhotoKind, ProjectId, PurposeId,
  Readiness, RegTopicId, RiskLevel, SeasonId,
} from '../types/models';

export interface Option<T extends string = string> {
  id: T;
  label: string;
  hint?: string;
  icon?: string;
}

export const MARKETS: Option<MarketId>[] = [
  { id: 'DE', label: 'Germany', icon: '🇩🇪' },
  { id: 'SY', label: 'Syria', icon: '🇸🇾' },
  { id: 'OTHER', label: 'Other country', icon: '🌍' },
  { id: 'MULTI', label: 'Multiple markets', icon: '🌐' },
];

export const BUSINESS_TYPES: Option<BusinessType>[] = [
  { id: 'B2B', label: 'B2B', hint: 'Business to Business: selling to companies.' },
  { id: 'B2C', label: 'B2C', hint: 'Business to Consumer: selling directly to end customers.' },
  { id: 'B2B2C', label: 'B2B2C', hint: 'A company sells through another company to end customers.' },
];

export const SEASONS: Option<SeasonId>[] = [
  { id: 'all', label: 'All Season' },
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'autumn', label: 'Autumn' },
  { id: 'winter', label: 'Winter' },
  { id: 'christmas', label: 'Christmas' },
  { id: 'ramadan', label: 'Ramadan' },
  { id: 'back_to_school', label: 'Back to School' },
  { id: 'other', label: 'Other' },
];

export const PURPOSES: Option<PurposeId>[] = [
  { id: 'import_resell', label: 'Import & Resell' },
  { id: 'develop_own', label: 'Develop own product' },
  { id: 'own_brand', label: 'Own brand' },
  { id: 'b2b_solution', label: 'B2B solution' },
  { id: 'test_babel', label: 'Test at Babel' },
  { id: 'integrate_lokka', label: 'Integrate with Lokka' },
  { id: 'market_observation', label: 'Market observation only' },
  { id: 'idea_only', label: 'Idea collection only' },
];

export const PROJECTS: Option<ProjectId>[] = [
  { id: 'babel', label: 'Babel' },
  { id: 'lokka', label: 'Lokka' },
  { id: 'import', label: 'Import Business' },
  { id: 'own_brand', label: 'Own Brand' },
  { id: 'startup', label: 'Startup' },
  { id: 'other', label: 'Other' },
];

export interface InvestorDef extends Option<InvestorId> {
  maxAmount: number | null;
}

export const INVESTORS: InvestorDef[] = [
  { id: 'AA', label: 'AA', maxAmount: 100_000 },
  { id: 'DH', label: 'DH', maxAmount: 200_000 },
  { id: 'NA', label: 'NA', maxAmount: 300_000 },
  { id: 'JS', label: 'JS', maxAmount: 30_000 },
  { id: 'NS', label: 'NS', maxAmount: 100_000 },
  { id: 'JN', label: 'JN', maxAmount: 10_000 },
  { id: 'UNKNOWN', label: 'Unknown / later', maxAmount: null },
];

export const INVESTMENT_TYPES: Option<InvestmentType>[] = [
  { id: 'equity', label: 'Equity' },
  { id: 'loan', label: 'Loan' },
  { id: 'both_unknown', label: 'Both / Unknown' },
];

export const READINESS: Option<Readiness>[] = [
  { id: 'certain', label: 'Certain' },
  { id: 'likely', label: 'Likely' },
  { id: 'maybe', label: 'Maybe' },
  { id: 'unknown', label: 'Unknown' },
];

export const RISK_LEVELS: Option<RiskLevel>[] = [
  { id: 'low', label: 'Low', icon: '🟢' },
  { id: 'medium', label: 'Medium', icon: '🟡' },
  { id: 'high', label: 'High', icon: '🔴' },
  { id: 'unknown', label: 'Unknown', icon: '⚪' },
];

export const REG_TOPICS: Option<RegTopicId>[] = [
  { id: 'CE', label: 'CE', hint: 'Indicates that the manufacturer declares conformity with applicable EU requirements.' },
  { id: 'DOC', label: 'EU Declaration of Conformity', hint: 'Document in which the manufacturer declares that the product meets all applicable EU rules. Needed for CE marking.' },
  { id: 'WEEE', label: 'WEEE', hint: 'EU rules concerning waste electrical and electronic equipment (registration and take-back, e.g. stiftung ear in Germany).' },
  { id: 'ROHS', label: 'RoHS', hint: 'EU restrictions on certain hazardous substances in electrical and electronic equipment.' },
  { id: 'BATTERY', label: 'Battery regulation', hint: 'EU Battery Regulation: labelling, registration and take-back duties for products with batteries.' },
  { id: 'FOOD', label: 'Food law', hint: 'EU and national food rules: labelling, ingredients, food contact, hygiene.' },
  { id: 'COSMETICS', label: 'Cosmetics regulation', hint: 'EU Cosmetics Regulation: safety assessment, responsible person and CPNP notification.' },
  { id: 'TOY', label: 'Toy safety', hint: 'EU Toy Safety rules for products intended for children under 14.' },
  { id: 'MEDICAL', label: 'Medical devices', hint: 'EU Medical Device Regulation (MDR): applies if the product claims a medical purpose.' },
  { id: 'REACH', label: 'REACH', hint: 'EU chemicals regulation: limits on substances of very high concern in articles.' },
  { id: 'PACKAGING', label: 'Packaging requirements', hint: 'EU packaging rules and the German VerpackG: registration (LUCID) and licensing of packaging.' },
];

export const CURRENCIES: Currency[] = ['EUR', 'USD', 'CNY'];

export const PHOTO_KINDS: Option<PhotoKind>[] = [
  { id: 'product', label: 'Product', icon: '📦' },
  { id: 'info', label: 'Info', icon: '🪪' },
  { id: 'booth', label: 'Booth', icon: '🏬' },
  { id: 'other', label: 'Other', icon: '🖼️' },
];

export const INFO_TYPES: Option<InfoType>[] = [
  { id: 'business_card', label: 'Business card' },
  { id: 'datasheet', label: 'Datasheet' },
  { id: 'price_list', label: 'Price list' },
  { id: 'qr', label: 'QR code' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'other', label: 'Other' },
];

export const SCORE_LABELS: Record<string, string> = {
  germanyDemand: 'Germany demand',
  competition: 'Competition',
  margin: 'Margin potential',
  startupCapital: 'Startup capital',
  scalability: 'Scalability',
  regulatoryEffort: 'Regulatory effort',
  importComplexity: 'Import complexity',
  privateLabel: 'Private label potential',
  personalFit: 'Personal fit',
};

export function labelOf<T extends string>(list: Option<T>[], id: T | null | undefined): string {
  return list.find((o) => o.id === id)?.label ?? '';
}
