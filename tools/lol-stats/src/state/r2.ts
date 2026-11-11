import { AwsClient } from 'aws4fetch';
import type { StateStore } from './store.ts';

export interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Optional key prefix inside the bucket. */
  prefix?: string;
  /** Injected for tests. */
  fetch?: typeof fetch;
}

/** Keys and continuation token of an S3 ListObjectsV2 XML response. */
export function parseListResponse(xml: string): { keys: string[]; next: string | null } {
  const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const keys = [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((m) => decode(m[1]!));
  const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const token = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
  return { keys, next: truncated && token ? decode(token) : null };
}

/** Cloudflare R2 (S3-compatible API, SigV4 signing with aws4fetch). */
export class R2StateStore implements StateStore {
  private readonly client: AwsClient;
  private readonly base: string;
  private readonly prefix: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: R2Options) {
    this.client = new AwsClient({ accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey, service: 's3', region: 'auto' });
    this.base = `https://${options.accountId}.r2.cloudflarestorage.com/${options.bucket}`;
    this.prefix = options.prefix ? options.prefix.replace(/\/?$/, '/') : '';
    this.fetchImpl = options.fetch ?? fetch;
  }

  private url(key: string): string {
    return `${this.base}/${(this.prefix + key).split('/').map(encodeURIComponent).join('/')}`;
  }

  private async send(url: string, init: RequestInit = {}): Promise<Response> {
    const signed = await this.client.sign(url, init);
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(signed.clone());
      if (res.status < 500 || attempt >= 3) return res;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const res = await this.send(this.url(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 GET ${key}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async put(key: string, body: Buffer): Promise<void> {
    const res = await this.send(this.url(key), { method: 'PUT', body: new Uint8Array(body) });
    if (!res.ok) throw new Error(`R2 PUT ${key}: ${res.status}`);
  }

  async delete(key: string): Promise<void> {
    const res = await this.send(this.url(key), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${key}: ${res.status}`);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | null = null;
    do {
      const params = new URLSearchParams({ 'list-type': '2', prefix: this.prefix + prefix });
      if (token) params.set('continuation-token', token);
      const res = await this.send(`${this.base}?${params}`);
      if (!res.ok) throw new Error(`R2 LIST ${prefix}: ${res.status}`);
      const page = parseListResponse(await res.text());
      keys.push(...page.keys.map((k) => k.slice(this.prefix.length)));
      token = page.next;
    } while (token);
    return keys.sort();
  }
}

/** R2 store when the four R2 variables are set, otherwise null. */
export function r2FromEnv(env: NodeJS.ProcessEnv = process.env): R2StateStore | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return new R2StateStore({
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    prefix: env.R2_PREFIX ?? 'lol-stats',
  });
}
