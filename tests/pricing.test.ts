import { PricingEngine } from '../src/services/PricingEngine';
import { MetricPlan } from '../src/types';

describe('PricingEngine', () => {
  let pricingEngine: PricingEngine;

  beforeEach(() => {
    pricingEngine = new PricingEngine();
  });

  test('calculates graduated pricing across multiple brackets accurately', () => {
    const plan: MetricPlan = {
      meterCode: 'api_calls',
      name: 'API Calls',
      aggregation: 'COUNT',
      pricingModel: 'TIERED_GRADUATED',
      tiers: [
        { upTo: 1000, unitPrice: 10 }, // 1000 * 10 = 10,000 cents ($100)
        { upTo: 5000, unitPrice: 5 },  // 4000 * 5 = 20,000 cents ($200)
        { upTo: null, unitPrice: 2 }   // remaining * 2
      ]
    };

    // Case 1: Within tier 1
    const res1 = pricingEngine.calculateCharge(plan, 500);
    expect(res1.subtotal).toBe(5000);

    // Case 2: Crossing into tier 2 (3000 units = 1000*10 + 2000*5 = 10000 + 10000 = 20000)
    const res2 = pricingEngine.calculateCharge(plan, 3000);
    expect(res2.subtotal).toBe(20000);

    // Case 3: Crossing into unbounded tier 3 (6000 units = 1000*10 + 4000*5 + 1000*2 = 10000 + 20000 + 2000 = 32000)
    const res3 = pricingEngine.calculateCharge(plan, 6000);
    expect(res3.subtotal).toBe(32000);
  });

  test('calculates volume pricing based on final unit bracket reached', () => {
    const plan: MetricPlan = {
      meterCode: 'storage_gb',
      name: 'Storage GB',
      aggregation: 'SUM',
      pricingModel: 'TIERED_VOLUME',
      tiers: [
        { upTo: 100, unitPrice: 15 },
        { upTo: 500, unitPrice: 10 },
        { upTo: null, unitPrice: 7 }
      ]
    };

    // 250 GB falls in tier 2 (<= 500), so ALL 250 units charged at 10 cents = 2500 cents
    const res = pricingEngine.calculateCharge(plan, 250);
    expect(res.subtotal).toBe(2500);
  });

  test('returns 0 charge for 0 usage units', () => {
    const plan: MetricPlan = {
      meterCode: 'api_calls',
      name: 'API Calls',
      aggregation: 'COUNT',
      pricingModel: 'TIERED_GRADUATED',
      tiers: [{ upTo: null, unitPrice: 10 }]
    };

    const res = pricingEngine.calculateCharge(plan, 0);
    expect(res.subtotal).toBe(0);
  });
});
