import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

/**
 * Persistent state between two runs (never in Git): compact game records, processed match ids,
 * sampled players. Keys are slash-separated paths such as `16.22/games/EUW1-2026-11-11-1.jsonl.gz`.
 */
export interface StateStore {
  get(key: string): Promise<Buffer | null>;
  /** `headers` (Content-Type, Cache-Control) are kept by R2 and served with the object. */
  put(key: string, body: Buffer, headers?: Record<string, string>): Promise<void>;
  /** Keys under a prefix, sorted. */
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
}

/** Local folder implementation (development, tests). */
export class FileStateStore implements StateStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async get(key: string): Promise<Buffer | null> {
    const file = join(this.root, key);
    return existsSync(file) ? readFileSync(file) : null;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const file = join(this.root, key);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }

  async list(prefix: string): Promise<string[]> {
    const base = join(this.root, prefix);
    const dir = existsSync(base) && statSync(base).isDirectory() ? base : dirname(base);
    if (!existsSync(dir)) return [];
    const out: string[] = [];
    const walk = (d: string) => {
      for (const name of readdirSync(d)) {
        const full = join(d, name);
        if (statSync(full).isDirectory()) walk(full);
        else out.push(relative(this.root, full).split('\\').join('/'));
      }
    };
    walk(dir);
    return out.filter((k) => k.startsWith(prefix)).sort();
  }

  async delete(key: string): Promise<void> {
    rmSync(join(this.root, key), { force: true });
  }
}

// ---------- helpers ----------

export async function getJson<T>(store: StateStore, key: string): Promise<T | null> {
  const body = await store.get(key);
  return body ? (JSON.parse(body.toString('utf8')) as T) : null;
}

export async function putJson(store: StateStore, key: string, value: unknown): Promise<void> {
  await store.put(key, Buffer.from(JSON.stringify(value)));
}

/** One JSON value per line, gzip-compressed. */
export function encodeJsonl(values: readonly unknown[]): Buffer {
  return gzipSync(Buffer.from(values.map((v) => JSON.stringify(v)).join('\n')));
}

export function* decodeJsonl<T>(body: Buffer): Generator<T> {
  const text = gunzipSync(body).toString('utf8');
  for (const line of text.split('\n')) if (line) yield JSON.parse(line) as T;
}

/** Match ids are stored gzip-compressed, one per line. */
export function encodeIds(ids: Iterable<string>): Buffer {
  return gzipSync(Buffer.from([...ids].join('\n')));
}

export function decodeIds(body: Buffer | null): Set<string> {
  return new Set(body ? gunzipSync(body).toString('utf8').split('\n').filter(Boolean) : []);
}
