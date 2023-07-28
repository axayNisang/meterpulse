import { UsageEvent } from '../types';
import { IdempotencyStore } from '../storage/IdempotencyStore';
import { EventStore } from '../storage/EventStore';
import { v4 as uuidv4 } from 'uuid';

export interface IngestionResult {
  eventId: string;
  status: 'ACCEPTED' | 'DUPLICATE';
  meterCode: string;
  recordedAt: string;
}

export class EventIngestionService {
  constructor(
    private eventStore: EventStore,
    private idempotencyStore: IdempotencyStore
  ) {}

  public ingest(eventPayload: Omit<UsageEvent, 'id'>): IngestionResult {
    this.validateEvent(eventPayload);

    const idempotency = this.idempotencyStore.checkAndAcquire(
      eventPayload.idempotencyKey,
      eventPayload
    );

    if (idempotency.isDuplicate) {
      return {
        ...idempotency.cachedResponse,
        status: 'DUPLICATE'
      };
    }

    const event: UsageEvent = {
      id: uuidv4(),
      ...eventPayload
    };

    this.eventStore.append(event);

    const result: IngestionResult = {
      eventId: event.id,
      status: 'ACCEPTED',
      meterCode: event.meterCode,
      recordedAt: new Date().toISOString()
    };

    this.idempotencyStore.store(eventPayload.idempotencyKey, eventPayload, result);
    return result;
  }

  public ingestBatch(events: Array<Omit<UsageEvent, 'id'>>): IngestionResult[] {
    return events.map(e => this.ingest(e));
  }

  private validateEvent(event: Omit<UsageEvent, 'id'>): void {
    if (!event.idempotencyKey || typeof event.idempotencyKey !== 'string') {
      throw new Error('Invalid event: idempotencyKey is required and must be a string');
    }
    if (!event.customerId || typeof event.customerId !== 'string') {
      throw new Error('Invalid event: customerId is required and must be a string');
    }
    if (!event.meterCode || typeof event.meterCode !== 'string') {
      throw new Error('Invalid event: meterCode is required and must be a string');
    }
    if (typeof event.value !== 'number' || isNaN(event.value) || event.value < 0) {
      throw new Error('Invalid event: value must be a non-negative number');
    }
    if (!event.timestamp || isNaN(new Date(event.timestamp).getTime())) {
      throw new Error('Invalid event: timestamp must be a valid ISO-8601 string');
    }
  }
}
