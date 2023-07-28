import crypto from 'crypto';

interface CachedRecord {
  resultHash: string;
  expiresAt: number;
  responsePayload: any;
}

export class IdempotencyStore {
  private cache: Map<string, CachedRecord> = new Map();
  private defaultTtlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.defaultTtlMs = ttlMs;
  }

  public checkAndAcquire(key: string, payload: any): { isDuplicate: boolean; cachedResponse?: any } {
    const now = Date.now();
    const payloadHash = this.computeHash(payload);
    const existing = this.cache.get(key);

    if (existing) {
      if (existing.expiresAt > now) {
        if (existing.resultHash !== payloadHash) {
          throw new Error(`Idempotency conflict: Key '${key}' reused with different payload payload payload.`);
        }
        return { isDuplicate: true, cachedResponse: existing.responsePayload };
      } else {
        this.cache.delete(key);
      }
    }

    return { isDuplicate: false };
  }

  public store(key: string, payload: any, response: any): void {
    const payloadHash = this.computeHash(payload);
    this.cache.set(key, {
      resultHash: payloadHash,
      expiresAt: Date.now() + this.defaultTtlMs,
      responsePayload: response
    });
  }

  private computeHash(payload: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  public clear(): void {
    this.cache.clear();
  }
}
