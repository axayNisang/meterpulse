import { MetricPlan, PricingTier } from '../types';

export interface RatingResult {
  meterCode: string;
  units: number;
  subtotal: number;
  breakdown: string;
}

export class PricingEngine {
  public calculateCharge(plan: MetricPlan, units: number): RatingResult {
    if (units <= 0) {
      return {
        meterCode: plan.meterCode,
        units: 0,
        subtotal: 0,
        breakdown: '0 units @ 0.00'
      };
    }

    switch (plan.pricingModel) {
      case 'FLAT_FEE':
        return {
          meterCode: plan.meterCode,
          units,
          subtotal: plan.tiers[0]?.flatFee || 0,
          breakdown: `Flat charge of $${((plan.tiers[0]?.flatFee || 0) / 100).toFixed(2)}`
        };

      case 'PER_UNIT': {
        const rate = plan.tiers[0]?.unitPrice || 0;
        const subtotal = Math.round(units * rate);
        return {
          meterCode: plan.meterCode,
          units,
          subtotal,
          breakdown: `${units} units @ $${(rate / 100).toFixed(4)}/unit`
        };
      }

      case 'TIERED_VOLUME':
        return this.calculateVolumeTier(plan.meterCode, plan.tiers, units);

      case 'TIERED_GRADUATED':
        return this.calculateGraduatedTier(plan.meterCode, plan.tiers, units);

      default:
        throw new Error(`Unknown pricing model: ${plan.pricingModel}`);
    }
  }

  private calculateVolumeTier(meterCode: string, tiers: PricingTier[], units: number): RatingResult {
    // Volume tier charges all units at the rate of the tier corresponding to the total volume
    let matchingTier = tiers[tiers.length - 1];
    for (const tier of tiers) {
      if (tier.upTo === null || units <= tier.upTo) {
        matchingTier = tier;
        break;
      }
    }

    const flatFee = matchingTier.flatFee || 0;
    const usageCharge = Math.round(units * matchingTier.unitPrice);
    const subtotal = flatFee + usageCharge;

    return {
      meterCode,
      units,
      subtotal,
      breakdown: `Volume bracket (<= ${matchingTier.upTo ?? 'Inf'}): ${units} units @ $${(matchingTier.unitPrice / 100).toFixed(4)}/unit` +
        (flatFee > 0 ? ` + $${(flatFee / 100).toFixed(2)} flat fee` : '')
    };
  }

  private calculateGraduatedTier(meterCode: string, tiers: PricingTier[], units: number): RatingResult {
    // Graduated tier charges units progressively within each tier bracket
    let remainingUnits = units;
    let previousBound = 0;
    let totalCharge = 0;
    const parts: string[] = [];

    for (const tier of tiers) {
      if (remainingUnits <= 0) break;

      const bracketCapacity = tier.upTo === null ? remainingUnits : tier.upTo - previousBound;
      const unitsInThisTier = Math.min(remainingUnits, bracketCapacity);

      if (unitsInThisTier > 0) {
        const tierCharge = Math.round(unitsInThisTier * tier.unitPrice) + (tier.flatFee || 0);
        totalCharge += tierCharge;
        parts.push(`${unitsInThisTier} @ $${(tier.unitPrice / 100).toFixed(4)}`);
        remainingUnits -= unitsInThisTier;
      }

      if (tier.upTo !== null) {
        previousBound = tier.upTo;
      }
    }

    return {
      meterCode,
      units,
      subtotal: totalCharge,
      breakdown: `Graduated: [${parts.join(', ')}]`
    };
  }
}
