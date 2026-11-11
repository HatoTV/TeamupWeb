/**
 * Riot rate limits: "app" limits per routing value (region / platform) and "method" limits per endpoint.
 * Limits are read from the response headers (`X-App-Rate-Limit: 20:1,100:120`), so the same code works
 * with a development, personal or production key. Until the first response, conservative defaults apply.
 */

export interface Window {
  /** Maximum requests in the window. */
  limit: number;
  /** Window length in seconds. */
  seconds: number;
}

/** `"20:1,100:120"` → `[{ limit: 20, seconds: 1 }, { limit: 100, seconds: 120 }]`. */
export function parseLimitHeader(header: string | null | undefined): Window[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => part.trim().split(':').map(Number))
    .filter(([limit, seconds]) => Number.isFinite(limit) && Number.isFinite(seconds) && limit! > 0 && seconds! > 0)
    .map(([limit, seconds]) => ({ limit: limit!, seconds: seconds! }));
}

/** `"3:1,57:120"` → Map(seconds → count). */
export function parseCountHeader(header: string | null | undefined): Map<number, number> {
  const counts = new Map<number, number>();
  for (const part of (header ?? '').split(',')) {
    const [count, seconds] = part.trim().split(':').map(Number);
    if (Number.isFinite(count) && Number.isFinite(seconds)) counts.set(seconds!, count!);
  }
  return counts;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Development-key limits, used until the server tells us the real ones. */
export const DEFAULT_APP_LIMITS: Window[] = [
  { limit: 20, seconds: 1 },
  { limit: 100, seconds: 120 },
];

/** A safety margin so that clock drift never makes us hit a 429. */
const SAFETY = 0.9;

/**
 * Sliding-window limiter for one bucket (one app limit or one method limit).
 * `acquire()` resolves when a request may be sent and records it.
 */
export class Bucket {
  private windows: Window[];
  private sent: number[] = [];
  private blockedUntil = 0;
  private readonly clock: Clock;

  constructor(windows: Window[], clock: Clock = realClock) {
    this.windows = windows;
    this.clock = clock;
  }

  get limits(): readonly Window[] {
    return this.windows;
  }

  /** Milliseconds to wait before the next request is allowed (0 = now). */
  waitTime(now = this.clock.now()): number {
    let wait = Math.max(0, this.blockedUntil - now);
    for (const w of this.windows) {
      const allowed = Math.max(1, Math.floor(w.limit * SAFETY));
      const since = now - w.seconds * 1000;
      const inWindow = this.sent.filter((t) => t > since);
      if (inWindow.length >= allowed) {
        const oldest = inWindow[inWindow.length - allowed]!;
        wait = Math.max(wait, oldest + w.seconds * 1000 - now + 1);
      }
    }
    return wait;
  }

  async acquire(): Promise<void> {
    for (;;) {
      const wait = this.waitTime();
      if (wait <= 0) break;
      await this.clock.sleep(wait);
    }
    this.record(this.clock.now());
  }

  record(at: number): void {
    this.sent.push(at);
    const longest = Math.max(1, ...this.windows.map((w) => w.seconds)) * 1000;
    const cutoff = at - longest;
    if (this.sent.length > 2000 || this.sent[0]! < cutoff) this.sent = this.sent.filter((t) => t > cutoff);
  }

  /** Updates limits from headers; if the server counted more requests than we did, align on it. */
  update(limits: Window[], counts: Map<number, number>): void {
    if (limits.length) this.windows = limits;
    const now = this.clock.now();
    for (const w of this.windows) {
      const serverCount = counts.get(w.seconds);
      if (serverCount === undefined) continue;
      const local = this.sent.filter((t) => t > now - w.seconds * 1000).length;
      for (let i = local; i < serverCount; i++) this.sent.push(now);
    }
  }

  /** 429: nothing goes out before `Retry-After` seconds. */
  block(seconds: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, this.clock.now() + seconds * 1000);
  }
}

/** Buckets per routing value: one app bucket, one bucket per method. */
export class RateLimiter {
  private readonly app = new Map<string, Bucket>();
  private readonly methods = new Map<string, Bucket>();
  private readonly clock: Clock;

  constructor(clock: Clock = realClock) {
    this.clock = clock;
  }

  appBucket(routing: string): Bucket {
    let bucket = this.app.get(routing);
    if (!bucket) this.app.set(routing, (bucket = new Bucket(DEFAULT_APP_LIMITS, this.clock)));
    return bucket;
  }

  methodBucket(routing: string, method: string): Bucket {
    const key = `${routing}:${method}`;
    let bucket = this.methods.get(key);
    // Method limits are unknown until the first response: start with the app defaults.
    if (!bucket) this.methods.set(key, (bucket = new Bucket(DEFAULT_APP_LIMITS, this.clock)));
    return bucket;
  }

  async acquire(routing: string, method: string): Promise<void> {
    const app = this.appBucket(routing);
    const m = this.methodBucket(routing, method);
    for (;;) {
      const wait = Math.max(app.waitTime(), m.waitTime());
      if (wait <= 0) break;
      await this.clock.sleep(wait);
    }
    const now = this.clock.now();
    app.record(now);
    m.record(now);
  }

  update(routing: string, method: string, headers: { get(name: string): string | null }): void {
    this.appBucket(routing).update(parseLimitHeader(headers.get('x-app-rate-limit')), parseCountHeader(headers.get('x-app-rate-limit-count')));
    this.methodBucket(routing, method).update(
      parseLimitHeader(headers.get('x-method-rate-limit')),
      parseCountHeader(headers.get('x-method-rate-limit-count'))
    );
  }

  /** 429 handling: `X-Rate-Limit-Type` tells which limit was hit (application, method or service). */
  block(routing: string, method: string, retryAfterSeconds: number, type: string | null): void {
    if (type === 'method') this.methodBucket(routing, method).block(retryAfterSeconds);
    else this.appBucket(routing).block(retryAfterSeconds);
  }
}
