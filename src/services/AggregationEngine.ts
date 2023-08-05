import { AggregatedUsage, MeterType, UsageEvent } from '../types';
import { EventStore } from '../storage/EventStore';

export class AggregationEngine {
  constructor(private eventStore: EventStore) {}

  public aggregate(
    customerId: string,
    meterCode: string,
    aggregationType: MeterType,
    periodStart: Date,
    periodEnd: Date
  ): AggregatedUsage {
    const events = this.eventStore.getEventsForCustomer(
      customerId,
      meterCode,
      periodStart,
      periodEnd
    );

    let aggregatedValue = 0;

    switch (aggregationType) {
      case 'SUM':
        aggregatedValue = events.reduce((acc, curr) => acc + curr.value, 0);
        break;

      case 'COUNT':
        aggregatedValue = events.length;
        break;

      case 'MAX':
        aggregatedValue = events.reduce((max, curr) => Math.max(max, curr.value), 0);
        break;

      case 'UNIQUE_COUNT': {
        const uniqueSet = new Set<string>();
        events.forEach(e => {
          if (e.properties && e.properties.distinctId) {
            uniqueSet.add(String(e.properties.distinctId));
          } else {
            uniqueSet.add(e.id);
          }
        });
        aggregatedValue = uniqueSet.size;
        break;
      }

      default:
        throw new Error(`Unsupported aggregation type: ${aggregationType}`);
    }

    return {
      customerId,
      meterCode,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      aggregatedValue: Math.round(aggregatedValue * 1000) / 1000,
      eventCount: events.length
    };
  }
}
