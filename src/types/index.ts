export type MeterType = 'SUM' | 'COUNT' | 'MAX' | 'UNIQUE_COUNT';

export type PricingModel = 'FLAT_FEE' | 'PER_UNIT' | 'TIERED_VOLUME' | 'TIERED_GRADUATED';

export interface PricingTier {
  upTo: number | null; // null represents infinity / unbounded upper bracket
  unitPrice: number;   // price per unit in smallest currency unit (e.g. cents)
  flatFee?: number;    // optional base fee for entering this tier
}

export interface MetricPlan {
  meterCode: string;
  name: string;
  aggregation: MeterType;
  pricingModel: PricingModel;
  tiers: PricingTier[];
}

export interface BillingPlan {
  id: string;
  name: string;
  baseFee: number; // recurring subscription base fee
  currency: string;
  billingPeriodDays: number;
  metrics: MetricPlan[];
}

export interface UsageEvent {
  id: string;
  idempotencyKey: string;
  customerId: string;
  meterCode: string;
  value: number;
  timestamp: string; // ISO-8601
  properties?: Record<string, any>;
}

export interface AggregatedUsage {
  customerId: string;
  meterCode: string;
  periodStart: string;
  periodEnd: string;
  aggregatedValue: number;
  eventCount: number;
}

export interface InvoiceLineItem {
  meterCode: string;
  description: string;
  units: number;
  rateDescription: string;
  subtotal: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  periodStart: string;
  periodEnd: string;
  baseFee: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
  generatedAt: string;
}
