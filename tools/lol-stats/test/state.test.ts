import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { R2StateStore, parseListResponse, r2FromEnv } from '../src/state/r2.ts';
import { FileStateStore, decodeIds, decodeJsonl, encodeIds, encodeJsonl } from '../src/state/store.ts';

describe('state encodings', () => {
  it('round-trips gzip JSONL and id sets', () => {
    const values = [{ a: 1 }, { b: 'x' }];
    assert.deepEqual([...decodeJsonl(encodeJsonl(values))], values);
    assert.deepEqual([...decodeIds(encodeIds(['EUW1_1', 'EUW1_2']))], ['EUW1_1', 'EUW1_2']);
    assert.equal(decodeIds(null).size, 0);
  });
});

describe('FileStateStore', () => {
  it('puts, gets, lists by prefix and deletes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lol-state-'));
    try {
      const store = new FileStateStore(dir);
      await store.put('16.22/games/a.jsonl.gz', Buffer.from('a'));
      await store.put('16.22/games/b.jsonl.gz', Buffer.from('b'));
      await store.put('16.22/meta.json', Buffer.from('{}'));
      assert.deepEqual(await store.list('16.22/games/'), ['16.22/games/a.jsonl.gz', '16.22/games/b.jsonl.gz']);
      assert.equal((await store.get('16.22/games/b.jsonl.gz'))!.toString(), 'b');
      assert.equal(await store.get('missing'), null);
      await store.delete('16.22/games/a.jsonl.gz');
      assert.deepEqual(await store.list('16.22/games/'), ['16.22/games/b.jsonl.gz']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('R2StateStore', () => {
  it('parses paginated ListObjectsV2 responses', () => {
    const xml = '<ListBucketResult><IsTruncated>true</IsTruncated><Contents><Key>p/16.22/a&amp;b</Key></Contents><NextContinuationToken>tok</NextContinuationToken></ListBucketResult>';
    assert.deepEqual(parseListResponse(xml), { keys: ['p/16.22/a&b'], next: 'tok' });
    assert.deepEqual(parseListResponse('<IsTruncated>false</IsTruncated>'), { keys: [], next: null });
  });

  it('signs requests to the R2 endpoint and follows pagination', async () => {
    const seen: Array<{ url: string; method: string; auth: string | null }> = [];
    const fakeFetch = (async (input: Request) => {
      seen.push({ url: input.url, method: input.method, auth: input.headers.get('authorization') });
      const url = new URL(input.url);
      if (url.searchParams.get('list-type')) {
        return url.searchParams.get('continuation-token')
          ? new Response('<IsTruncated>false</IsTruncated><Contents><Key>lol-stats/16.22/b</Key></Contents>')
          : new Response('<IsTruncated>true</IsTruncated><Contents><Key>lol-stats/16.22/a</Key></Contents><NextContinuationToken>t2</NextContinuationToken>');
      }
      if (input.method === 'GET') return url.pathname.endsWith('/missing') ? new Response('', { status: 404 }) : new Response('body');
      return new Response('', { status: 200 });
    }) as unknown as typeof fetch;
    const store = new R2StateStore({ accountId: 'acc', accessKeyId: 'AK', secretAccessKey: 'SK', bucket: 'teamupp', prefix: 'lol-stats', fetch: fakeFetch });

    await store.put('16.22/meta.json', Buffer.from('{}'));
    assert.equal(seen[0]!.url, 'https://acc.r2.cloudflarestorage.com/teamupp/lol-stats/16.22/meta.json');
    assert.equal(seen[0]!.method, 'PUT');
    assert.match(seen[0]!.auth ?? '', /^AWS4-HMAC-SHA256 Credential=AK\//);
    assert.equal((await store.get('16.22/meta.json'))!.toString(), 'body');
    assert.equal(await store.get('missing'), null);
    assert.deepEqual(await store.list('16.22/'), ['16.22/a', '16.22/b']);
  });

  it('is used only when the four R2 variables are set', () => {
    assert.equal(r2FromEnv({}), null);
    assert.ok(r2FromEnv({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd' }) instanceof R2StateStore);
  });
});
