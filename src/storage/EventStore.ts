import { UsageEvent } from '../types';

export class EventStore {
  private events: UsageEvent[] = [];

  public append(event: UsageEvent): void {
    this.events.push(event);
  }

  public appendBatch(events: UsageEvent[]): void {
    this.events.push(...events);
  }

  public getEventsForCustomer(customerId: string, meterCode?: string, start?: Date, end?: Date): UsageEvent[] {
    return this.events.filter(e => {
      if (e.customerId !== customerId) return false;
      if (meterCode && e.meterCode !== meterCode) return false;
      const eventTime = new Date(e.timestamp).getTime();
      if (start && eventTime < start.getTime()) return false;
      if (end && eventTime > end.getTime()) return false;
      return true;
    });
  }

  public count(): number {
    return this.events.length;
  }

  public clear(): void {
    this.events = [];
  }
}
