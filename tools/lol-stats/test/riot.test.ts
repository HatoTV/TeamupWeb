import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RiotClient } from '../src/riot/client.ts';
import { Bucket, RateLimiter, parseCountHeader, parseLimitHeader } from '../src/riot/rate-limiter.ts';
import { hostOf, regionOf } from '../src/riot/routing.ts';
import { currentPatch, isGameInPatch, patchOf, previousPatch } from '../src/patch.ts';
import { fakeClock, jsonResponse } from './helpers.ts';

describe('routing', () => {
  it('maps platforms to regional routing values', () => {
    assert.equal(regionOf('EUW1'), 'europe');
    assert.equal(regionOf('EUN1'), 'europe');
    assert.equal(regionOf('TR1'), 'europe');
    assert.equal(regionOf('RU'), 'europe');
    assert.equal(regionOf('KR'), 'asia');
    assert.equal(regionOf('JP1'), 'asia');
    assert.equal(regionOf('NA1'), 'americas');
    assert.equal(regionOf('LA2'), 'americas');
    assert.equal(hostOf('EUW1'), 'euw1.api.riotgames.com');
    assert.equal(hostOf('europe'), 'europe.api.riotgames.com');
  });
});

describe('patch', () => {
  it('takes major.minor from Data Dragon and game versions', () => {
    assert.equal(patchOf('16.22.1'), '16.22');
    assert.equal(patchOf('16.22.715.1234'), '16.22');
    assert.deepEqual(currentPatch(['16.22.1', '16.21.1']), { patch: '16.22', version: '16.22.1' });
    assert.equal(previousPatch(['16.22.1', 'lolpatch_7.20', '16.21.1'], '16.22'), '16.21');
  });

  it('checks that a game belongs to the patch', () => {
    assert.ok(isGameInPatch('16.22.715.1234', '16.22'));
    assert.ok(!isGameInPatch('16.21.700.1', '16.22'));
    assert.ok(!isGameInPatch('16.2.1', '16.22'));
    assert.ok(!isGameInPatch('garbage', '16.22'));
  });
});

describe('rate limit headers', () => {
  it('parses limits and counts', () => {
    assert.deepEqual(parseLimitHeader('20:1,100:120'), [
      { limit: 20, seconds: 1 },
      { limit: 100, seconds: 120 },
    ]);
    assert.deepEqual(parseLimitHeader(null), []);
    assert.deepEqual([...parseCountHeader('3:1,57:120')], [
      [1, 3],
      [120, 57],
    ]);
  });
});

describe('Bucket', () => {
  it('never exceeds 90 % of a window', async () => {
    const clock = fakeClock();
    const bucket = new Bucket([{ limit: 10, seconds: 1 }], clock);
    const start = clock.now();
    for (let i = 0; i < 9; i++) await bucket.acquire();
    assert.equal(clock.now(), start, 'first 9 requests go out immediately');
    await bucket.acquire();
    assert.ok(clock.now() - start >= 1000, 'the 10th waits for the window to slide');
  });

  it('respects the longest window too', async () => {
    const clock = fakeClock();
    const bucket = new Bucket([{ limit: 20, seconds: 1 }, { limit: 100, seconds: 120 }], clock);
    for (let i = 0; i < 90; i++) await bucket.acquire();
    const before = clock.now();
    await bucket.acquire();
    assert.ok(clock.now() - before > 100_000, 'request 91 waits for the 2-minute window');
  });

  it('aligns on server counts and honours blocks', () => {
    const clock = fakeClock();
    const bucket = new Bucket([{ limit: 10, seconds: 10 }], clock);
    bucket.update([], new Map([[10, 9]]));
    assert.ok(bucket.waitTime() > 0, 'server says the window is full');
    const fresh = new Bucket([{ limit: 10, seconds: 10 }], clock);
    fresh.block(5);
    assert.equal(fresh.waitTime(), 5000);
  });
});

describe('RiotClient', () => {
  it('reads limits from headers, retries after a 429 with Retry-After and returns null on 404', async () => {
    const clock = fakeClock();
    const calls: string[] = [];
    let first = true;
    const fakeFetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      assert.equal((init?.headers as Record<string, string>)['X-Riot-Token'], 'RGAPI-test');
      if (url.includes('/missing')) return jsonResponse({}, 404);
      if (first) {
        first = false;
        return jsonResponse({}, 429, { 'retry-after': '7', 'x-rate-limit-type': 'application' });
      }
      return jsonResponse(['EUW1_1'], 200, {
        'x-app-rate-limit': '500:10,30000:600',
        'x-app-rate-limit-count': '1:10,1:600',
        'x-method-rate-limit': '2000:10',
        'x-method-rate-limit-count': '1:10',
      });
    }) as typeof fetch;
    const limiter = new RateLimiter(clock);
    const client = new RiotClient({ apiKey: 'RGAPI-test', clock, limiter, fetch: fakeFetch });

    const ids = await client.get<string[]>('europe', 'match-v5.by-puuid', '/lol/match/v5/matches/by-puuid/x/ids', { queue: 420 });
    assert.deepEqual(ids, ['EUW1_1']);
    assert.equal(calls.length, 2);
    assert.ok(calls[0]!.includes('queue=420'));
    assert.ok(clock.slept.some((ms) => ms >= 7000), 'waited Retry-After');
    assert.equal(client.stats.rateLimited, 1);
    assert.deepEqual(limiter.appBucket('europe').limits, [
      { limit: 500, seconds: 10 },
      { limit: 30000, seconds: 600 },
    ]);

    assert.equal(await client.get('europe', 'm', '/missing'), null);
  });

  it('refuses to start without a key', () => {
    assert.throws(() => new RiotClient({ apiKey: '' }), /RIOT_API_KEY/);
  });
});
