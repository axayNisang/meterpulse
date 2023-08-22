import { BillingPlan, Invoice, InvoiceLineItem } from '../types';
import { AggregationEngine } from './AggregationEngine';
import { PricingEngine } from './PricingEngine';
import { v4 as uuidv4 } from 'uuid';

export class InvoiceGenerator {
  constructor(
    private aggregationEngine: AggregationEngine,
    private pricingEngine: PricingEngine
  ) {}

  public generate(
    customerId: string,
    plan: BillingPlan,
    periodStart: Date,
    periodEnd: Date,
    taxRatePercent: number = 0
  ): Invoice {
    const lineItems: InvoiceLineItem[] = [];
    let usageSubtotal = 0;

    for (const metric of plan.metrics) {
      const agg = this.aggregationEngine.aggregate(
        customerId,
        metric.meterCode,
        metric.aggregation,
        periodStart,
        periodEnd
      );

      const rating = this.pricingEngine.calculateCharge(metric, agg.aggregatedValue);

      lineItems.push({
        meterCode: metric.meterCode,
        description: metric.name,
        units: agg.aggregatedValue,
        rateDescription: rating.breakdown,
        subtotal: rating.subtotal
      });

      usageSubtotal += rating.subtotal;
    }

    const netSubtotal = plan.baseFee + usageSubtotal;
    const tax = Math.round((netSubtotal * taxRatePercent) / 100);
    const total = netSubtotal + tax;

    return {
      id: `inv_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      customerId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      baseFee: plan.baseFee,
      lineItems,
      subtotal: netSubtotal,
      tax,
      total,
      currency: plan.currency,
      status: 'ISSUED',
      generatedAt: new Date().toISOString()
    };
  }
}
