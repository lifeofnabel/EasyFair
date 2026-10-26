export type ID = string;
/** ISO 8601 timestamp */
export type ISODate = string;

export type MarketId = 'DE' | 'SY' | 'OTHER' | 'MULTI';
export type BusinessType = 'B2B' | 'B2C' | 'B2B2C';
export type SeasonId =
  | 'all' | 'spring' | 'summer' | 'autumn' | 'winter' | 'christmas' | 'ramadan' | 'back_to_school' | 'other';
export type PurposeId =
  | 'import_resell' | 'develop_own' | 'own_brand' | 'b2b_solution' | 'test_babel' | 'integrate_lokka'
  | 'market_observation' | 'idea_only';
export type ProjectId = 'hala' | 'lokka' | 'mts' | 'robo' | 'babel' | 'import' | 'own_brand' | 'startup' | 'other';
export type Priority = 'A' | 'B' | 'C';
export type SupplierType = 'factory' | 'trading' | 'both';
export type CertId = 'CE' | 'ROHS' | 'RED' | 'NONE';
export type PaymentId = 'TT_30_70' | 'TT_50_50' | 'TT_100' | 'LC' | 'OTHER';
export type Incoterm = 'FOB' | 'EXW' | 'DDP' | 'CIF' | 'OTHER';
export type DeDistributor = 'yes' | 'no' | 'unknown';
export type RedFlagId = 'private_account' | 'no_cert_proof' | 'time_pressure' | 'no_company';
export type InvestorId = 'AA' | 'DH' | 'NA' | 'JS' | 'NS' | 'JN' | 'UNKNOWN';
export type InvestmentType = 'equity' | 'loan' | 'both_unknown';
export type Readiness = 'certain' | 'likely' | 'maybe' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type RegTopicId =
  | 'CE' | 'DOC' | 'RED' | 'WEEE' | 'ROHS' | 'BATTERY' | 'FOOD' | 'COSMETICS' | 'TOY' | 'MEDICAL' | 'REACH' | 'PACKAGING';
export type Currency = 'EUR' | 'USD' | 'CNY';
export type CategoryId =
  | 'food' | 'packaging' | 'automation' | 'industry' | 'trading' | 'retail' | 'energy' | 'school_office'
  | 'care_fitness' | 'idea';

export type PhotoKind = 'product' | 'info' | 'booth' | 'other';
export type InfoType = 'business_card' | 'datasheet' | 'price_list' | 'qr' | 'packaging' | 'other';
export type UploadState = 'local' | 'uploading' | 'uploaded' | 'failed';

export interface Photo {
  id: ID;
  kind: PhotoKind;
  infoType?: InfoType;
  createdAt: ISODate;
  width: number;
  height: number;
  uploadState: UploadState;
  /** Cloudinary original (high quality). Low quality is derived by URL transformation. */
  remote?: { publicId: string; url: string };
  /** Raw QR payload, if one was decoded from this photo. */
  qrValue?: string;
  /** Set once the image was sent to AI, so it is never analysed twice by accident. */
  aiUsedAt?: ISODate;
}

/** Local-only image data; never synced to Firestore. */
export interface PhotoBlob {
  id: ID;
  productId: ID;
  low: Blob;
  /** Removed after a confirmed Cloudinary upload to save phone storage. */
  high?: Blob;
}

export interface Supplier {
  company: string;
  contactPerson: string;
  position: string;
  phone: string;
  whatsapp: string;
  wechat: string;
  email: string;
  website: string;
  address: string;
  boothNumber: string;
}

export interface InvestorLink {
  investorId: InvestorId;
  type?: InvestmentType;
  readiness?: Readiness;
}

export interface Pricing {
  supplierPrice?: number;
  currency: Currency;
  moq?: number;
  targetSellingPrice?: number;
  estimatedMargin?: number;
  startupCapital?: number;
  note: string;
}

export interface Regulatory {
  risk: RiskLevel;
  topics: RegTopicId[];
  note: string;
}

export type AnswerValue = string | string[] | boolean | number;

export interface AiAnalysis {
  summary: string;
  advantages: string[];
  disadvantages: string[];
  questions: string[];
  regulatoryHint?: { risk: RiskLevel; topics: RegTopicId[] };
  provider: string;
  at: ISODate;
}

export const SCORE_DIMENSIONS = [
  'germanyDemand', 'competition', 'margin', 'startupCapital', 'scalability',
  'regulatoryEffort', 'importComplexity', 'privateLabel', 'personalFit',
] as const;
export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number];

export interface AiScore {
  /** 0-10 each, 10 = favourable for you (e.g. low competition = high score). */
  dims: Record<ScoreDimension, number>;
  total: number;
  why: string;
  provider: string;
  at: ISODate;
}

export type HistoryAction =
  | 'created' | 'followup_sent' | 'edited' | 'ai_structured' | 'ai_analysis' | 'ai_score' | 'archived' | 'restored' | 'photo_added';

export interface HistoryEntry {
  at: ISODate;
  action: HistoryAction;
}

/** Answers of the 8-step stand conversation. Every field is optional: any step can be skipped. */
export interface StandData {
  supplierType?: SupplierType;
  certs?: CertId[];
  moqUnit?: string;
  tiers?: { q100?: number; q500?: number; q1000?: number };
  sample?: { available?: boolean; cost?: number; refunded?: boolean };
  leadTimeDays?: number;
  payment?: PaymentId;
  incoterm?: Incoterm;
  deDistributor?: DeDistributor;
}

export interface Product {
  id: ID;
  ownerId: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt: ISODate | null;

  name: string;
  notes: string;
  /** Short AI-written (or hand-written) description of the product. */
  description: string;
  voiceTranscript: string;

  categoryId: CategoryId | null;
  categoryAnswers: Record<string, AnswerValue>;

  targetMarkets: MarketId[];
  otherCountries: string[];
  businessType: BusinessType | null;
  seasons: SeasonId[];
  purposes: PurposeId[];
  projects: ProjectId[];
  investors: InvestorLink[];

  interest: number;
  needsReview: boolean;

  supplier: Supplier;
  fairId: ID | null;
  hall: string;

  pricing: Pricing;
  regulatory: Regulatory;
  oem: boolean | null;

  /** A = must, B = if time, C = optional. Null until triaged. */
  priority: Priority | null;
  stand: StandData;
  redFlags: RedFlagId[];
  followUpSentAt: ISODate | null;

  ai: { analysis?: AiAnalysis; score?: AiScore; structuredAt?: ISODate };
  photos: Photo[];
  history: HistoryEntry[];
}

/** Local bookkeeping kept next to each product (not synced). */
export interface SyncMeta {
  id: ID;
  dirty: 0 | 1;
  lastSyncedAt?: ISODate;
}

export interface Fair {
  id: ID;
  name: string;
  city: string;
  country: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  venue?: string;
}

export interface FairSession {
  fairId: ID | null;
  hall: string;
}

export interface AppSettings {
  aiProvider: 'mock' | 'anthropic' | 'deepseek';
  deepseekApiKey: string;
  deepseekModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  cloudinaryCloudName: string;
  /** Public identifier only. The API secret is never stored in the app. */
  cloudinaryApiKey: string;
  cloudinaryUploadPreset: string;
  cloudinaryFolder: string;
  autoStructureVoice: boolean;
}

/** Suggestion produced from voice/photo; never written without user confirmation. */
export interface StructuredSuggestion {
  name?: string;
  description?: string;
  categoryId?: CategoryId;
  categoryAnswers?: Record<string, AnswerValue>;
  targetMarkets?: MarketId[];
  otherCountries?: string[];
  businessType?: BusinessType;
  projects?: ProjectId[];
  purposes?: PurposeId[];
  seasons?: SeasonId[];
  price?: { amount: number; currency: Currency };
  moq?: number;
  oem?: boolean;
  interest?: number;
  supplierCompany?: string;
}

export type SupplierField = keyof Supplier;
export type ContactSuggestion = Partial<Record<SupplierField, string>>;
