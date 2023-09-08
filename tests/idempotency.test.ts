import { IdempotencyStore } from '../src/storage/IdempotencyStore';
import { EventStore } from '../src/storage/EventStore';
import { EventIngestionService } from '../src/services/EventIngestionService';

describe('EventIngestion & Idempotency', () => {
  let eventStore: EventStore;
  let idempotencyStore: IdempotencyStore;
  let ingestionService: EventIngestionService;

  beforeEach(() => {
    eventStore = new EventStore();
    idempotencyStore = new IdempotencyStore(60000);
    ingestionService = new EventIngestionService(eventStore, idempotencyStore);
  });

  test('deduplicates identical events using idempotency key without duplicate DB entry', () => {
    const payload = {
      idempotencyKey: 'idem_key_unique_123',
      customerId: 'cust_abc',
      meterCode: 'compute_ms',
      value: 450,
      timestamp: new Date().toISOString()
    };

    const res1 = ingestionService.ingest(payload);
    expect(res1.status).toBe('ACCEPTED');
    expect(eventStore.count()).toBe(1);

    // Second call with same idempotency key
    const res2 = ingestionService.ingest(payload);
    expect(res2.status).toBe('DUPLICATE');
    expect(res2.eventId).toBe(res1.eventId);
    expect(eventStore.count()).toBe(1); // Store count remains 1
  });

  test('throws conflict error if same idempotency key is reused with different payload', () => {
    const payload1 = {
      idempotencyKey: 'key_conflict_test',
      customerId: 'cust_abc',
      meterCode: 'compute_ms',
      value: 100,
      timestamp: new Date().toISOString()
    };

    const payload2 = {
      idempotencyKey: 'key_conflict_test',
      customerId: 'cust_abc',
      meterCode: 'compute_ms',
      value: 999, // altered value
      timestamp: new Date().toISOString()
    };

    ingestionService.ingest(payload1);
    expect(() => ingestionService.ingest(payload2)).toThrow(/Idempotency conflict/);
  });
});
