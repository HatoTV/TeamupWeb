import { RateLimiter, realClock, type Clock } from './rate-limiter.ts';
import { hostOf, type Platform, type Region } from './routing.ts';

export class RiotApiError extends Error {
  readonly status: number;
  /** Refused by the Cloudflare firewall in front of the API (HTML page): some encrypted ids look like an attack to it. */
  readonly firewall: boolean;
  constructor(status: number, message: string, firewall = false) {
    super(message);
    this.status = status;
    this.firewall = firewall;
  }
}

export interface RiotClientOptions {
  apiKey: string;
  limiter?: RateLimiter;
  clock?: Clock;
  fetch?: typeof fetch;
  /** Retries for 429 / 5xx / network errors. */
  maxRetries?: number;
}

export interface RequestStats {
  requests: number;
  rateLimited: number;
  errors: number;
}

/**
 * Minimal Riot API client: one rate limiter per routing value and per method, `Retry-After` on 429,
 * exponential backoff on 5xx. The API key is only sent in the `X-Riot-Token` header and never logged.
 */
export class RiotClient {
  readonly stats: RequestStats = { requests: 0, rateLimited: 0, errors: 0 };
  private readonly apiKey: string;
  private readonly limiter: RateLimiter;
  private readonly clock: Clock;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;

  constructor(options: RiotClientOptions) {
    if (!options.apiKey) throw new Error('RIOT_API_KEY is missing (tools/lol-stats/.env or GitHub secret)');
    this.apiKey = options.apiKey;
    this.clock = options.clock ?? realClock;
    this.limiter = options.limiter ?? new RateLimiter(this.clock);
    this.fetchImpl = options.fetch ?? fetch;
    this.maxRetries = options.maxRetries ?? 5;
  }

  /**
   * GET `path` on a platform or region. `method` identifies the endpoint for method rate limits
   * (e.g. `match-v5.matches`). Returns null on 404.
   */
  async get<T>(routing: Platform | Region, method: string, path: string, query: Record<string, string | number> = {}): Promise<T | null> {
    const url = new URL(`https://${hostOf(routing)}${path}`);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

    for (let attempt = 0; ; attempt++) {
      await this.limiter.acquire(routing, method);
      this.stats.requests++;
      let res: Response;
      try {
        res = await this.fetchImpl(url, { headers: { 'X-Riot-Token': this.apiKey, Accept: 'application/json' } });
      } catch (error) {
        this.stats.errors++;
        if (attempt >= this.maxRetries) throw error;
        await this.clock.sleep(1000 * 2 ** attempt);
        continue;
      }
      this.limiter.update(routing, method, res.headers);

      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return null;
      if (res.status === 429) {
        this.stats.rateLimited++;
        const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
        this.limiter.block(routing, method, retryAfter, res.headers.get('x-rate-limit-type'));
        if (attempt >= this.maxRetries) throw new RiotApiError(429, `Rate limited on ${method}`);
        continue;
      }
      if (res.status >= 500 && attempt < this.maxRetries) {
        this.stats.errors++;
        await this.clock.sleep(1000 * 2 ** attempt);
        continue;
      }
      this.stats.errors++;
      // 401 / 403 in JSON: key missing, expired (development keys last 24 h) or not allowed.
      // 403 in HTML: the Cloudflare firewall blocked this URL (the key is not involved).
      const firewall = res.status === 403 && !(res.headers.get('content-type') ?? '').includes('json');
      throw new RiotApiError(res.status, `${res.status}${firewall ? ' (Cloudflare firewall)' : ''} on ${method} ${url.pathname}`, firewall);
    }
  }
}
