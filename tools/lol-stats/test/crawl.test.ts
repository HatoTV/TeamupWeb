import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.ts';
import { crawl, gamesPrefix, seenKey } from '../src/crawl.ts';
import { DataDragon } from '../src/ddragon.ts';
import type { GameRecord } from '../src/extract/game.ts';
import { RiotClient } from '../src/riot/client.ts';
import { RateLimiter } from '../src/riot/rate-limiter.ts';
import { FileStateStore, decodeIds, decodeJsonl } from '../src/state/store.ts';
import { fakeClock, jsonResponse } from './helpers.ts';

const FIXTURES = new URL('../fixtures/', import.meta.url);
const games = Object.fromEntries(
  readdirSync(FIXTURES)
    .filter((f) => f.startsWith('TEST_'))
    .map((f) => {
      const g = JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8'));
      return [g.match.metadata.matchId, g];
    })
);
const items = JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8'));

function fakeRiot(calls: string[]): typeof fetch {
  return (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    const p = url.pathname;
    if (p.includes('challengerleagues')) return jsonResponse({ tier: 'CHALLENGER', entries: [{ puuid: 'puuid-1', leaguePoints: 1, wins: 1, losses: 1 }] });
    if (p.includes('grandmasterleagues') || p.includes('masterleagues')) return jsonResponse({ tier: 'X', entries: [] });
    if (p.includes('/entries/')) return jsonResponse(p.includes('DIAMOND/I') && url.searchParams.get('page') === '1' ? [{ puuid: 'puuid-2', leaguePoints: 1, wins: 1, losses: 1, tier: 'DIAMOND', queueType: 'RANKED_SOLO_5x5' }] : []);
    if (p.endsWith('/ids')) return jsonResponse(Object.keys(games));
    const id = p.split('/')[5]!;
    if (p.endsWith('/timeline')) return jsonResponse(games[id].timeline);
    return jsonResponse(games[id].match);
  }) as typeof fetch;
}

const ddragonFetch = (async (input: URL | RequestInfo) => {
  const url = String(input);
  if (url.endsWith('versions.json')) return jsonResponse(['16.22.1', '16.21.1']);
  if (url.endsWith('item.json')) return jsonResponse(items);
  throw new Error(`unexpected ${url}`);
}) as typeof fetch;

describe('crawl', () => {
  it('collects new games once, labels them with the lowest known tier and saves the state', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lol-stats-'));
    try {
      const store = new FileStateStore(dir);
      const clock = fakeClock(Date.UTC(2026, 10, 11));
      const calls: string[] = [];
      const client = new RiotClient({ apiKey: 'RGAPI-test', clock, limiter: new RateLimiter(clock), fetch: fakeRiot(calls) });
      const config = loadConfig({ apiKey: 'RGAPI-test', platforms: ['EUW1'], pagesPerDivision: 1, budgetMinutes: 60, maxGames: 0 });
      const deps = { client, store, ddragon: new DataDragon(ddragonFetch), now: clock.now };

      const [report] = await crawl(config, deps);
      assert.equal(report!.patch, '16.22');
      assert.equal(report!.newGames, 5);
      assert.equal(report!.players.CHALLENGER, 1);
      assert.equal(report!.players.DIAMOND, 1);

      const files = await store.list(gamesPrefix('16.22'));
      assert.equal(files.length, 1);
      const saved = [...decodeJsonl<GameRecord>((await store.get(files[0]!))!)];
      assert.equal(saved.length, 5);
      assert.ok(saved.every((g) => g.participants.length === 10));
      assert.equal(decodeIds(await store.get(seenKey('16.22', 'EUW1'))).size, 5);
      // Fixtures anonymise every game with the same fake puuids: puuid-1 (Challenger) and puuid-2 (Diamond)
      // are both in each game, so the lowest known tier wins.
      assert.ok(saved.every((g) => g.tier === 'DIAMOND'));

      // Second run: same ids, nothing new is downloaded.
      calls.length = 0;
      const [again] = await crawl(config, deps);
      assert.equal(again!.newGames, 0);
      assert.ok(!calls.some((c) => c.includes('/timeline')), 'no timeline fetched twice');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
