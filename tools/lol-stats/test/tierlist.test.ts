import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { wilsonLower } from '../src/aggregate/stats.ts';
import { MainRoles } from '../src/aggregate/roles.ts';
import { TierListCounter, tierAt, tierListScore } from '../src/aggregate/tierlist.ts';
import { bandOf, filtersForTier, loadConfig, type SampledTier } from '../src/config.ts';
import { crawl, gamesPrefix } from '../src/crawl.ts';
import { DataDragon } from '../src/ddragon.ts';
import type { GameRecord, Role } from '../src/extract/game.ts';
import { RiotClient } from '../src/riot/client.ts';
import { RateLimiter } from '../src/riot/rate-limiter.ts';
import { tierListSchema } from '../src/schema.ts';
import { FileStateStore, decodeJsonl } from '../src/state/store.ts';
import { fakeClock, jsonResponse } from './helpers.ts';

const CONFIG = { lowSampleGames: 200, tierPickWeight: 0.06, tierPickCap: 10, tierCuts: [0.08, 0.22, 0.45, 0.7, 0.88] };
const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];

/** `n` games of `tier` where `champion` plays `role` and wins `wins` of them; the 9 others are filler champions (id ≥ 900). */
function games(tier: SampledTier, champion: number, role: Role, n: number, wins: number, ownTier?: SampledTier): GameRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `G_${tier}_${champion}_${role}_${i}`,
    platform: 'EUW1',
    patch: '16.22',
    tier,
    durationS: 1800,
    bans: [],
    participants: ROLES.flatMap((r, k) => [
      { champion: r === role ? champion : 900 + k, role: r, win: r === role ? i < wins : true, ...(r === role && ownTier ? { tier: ownTier } : {}) },
      { champion: 950 + k, role: r, win: false },
    ]) as unknown as GameRecord['participants'],
  }));
}

const filesOf = (records: GameRecord[]) => {
  const counter = new TierListCounter();
  for (const g of records) counter.add(g);
  return counter.files('16.22', CONFIG, '2026-11-16T00:00:00.000Z');
};

describe('tier list', () => {
  it('Wilson lower bound (95 %): known values', () => {
    assert.equal(wilsonLower(0, 0), 0);
    assert.ok(Math.abs(wilsonLower(50, 100) - 0.4038) < 1e-4);
    assert.ok(Math.abs(wilsonLower(10, 10) - 0.7225) < 1e-4);
    assert.ok(Math.abs(wilsonLower(0, 10) - 0) < 1e-12);
    assert.ok(Math.abs(wilsonLower(520, 1000) - 0.4890) < 1e-4);
  });

  it('score = 100 × Wilson + 0.06 × min(pick %, 10)', () => {
    assert.ok(Math.abs(tierListScore(50, 100, 0.05, CONFIG) - (40.38 + 0.3)) < 0.01);
    // Pick bonus capped at 10 %: 25 % and 10 % give the same score.
    assert.equal(tierListScore(50, 100, 0.25, CONFIG), tierListScore(50, 100, 0.1, CONFIG));
  });

  it('tiers by percentile p = (rank + 0.5) / n, small samples', () => {
    const tiers = (n: number) => Array.from({ length: n }, (_, i) => tierAt(i, n, CONFIG.tierCuts));
    assert.deepEqual(tiers(1), ['B']);
    assert.deepEqual(tiers(5), ['S', 'A', 'B', 'C', 'D']);
    assert.deepEqual(tiers(11), ['S+', 'S', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'D']);
    const count = (list: string[]) => Object.fromEntries(['S+', 'S', 'A', 'B', 'C', 'D'].map((t) => [t, list.filter((x) => x === t).length]));
    assert.deepEqual(count(tiers(24)), { 'S+': 2, S: 3, A: 6, B: 6, C: 4, D: 3 });
  });

  it('under 200 games: no tier, listed in unranked', () => {
    const [, , elite] = filesOf([...games('MASTER', 1, 'MIDDLE', 200, 110), ...games('MASTER', 2, 'MIDDLE', 199, 120)]);
    tierListSchema.parse(elite);
    assert.deepEqual(elite!.champions.filter((c) => c.role === 'mid' && c.championId < 900).map((c) => c.championId), [1]);
    assert.deepEqual(elite!.unranked.filter((c) => c.role === 'mid'), [{ championId: 2, role: 'mid', games: 199 }]);
    assert.equal(elite!.minGames, 200);
  });

  it('a champion played in two roles has two independent entries', () => {
    const [, mid] = filesOf([...games('EMERALD', 7, 'TOP', 300, 165), ...games('EMERALD', 7, 'MIDDLE', 250, 115)]);
    const entries = mid!.champions.filter((c) => c.championId === 7);
    assert.deepEqual(
      entries.map((c) => [c.role, c.games, c.wins, c.winRate]),
      [
        ['top', 300, 165, 0.55],
        ['mid', 250, 115, 0.46],
      ]
    );
    // Pick rate = games of the champion in the role / games of the band (550 games here).
    assert.equal(mid!.totalGames, 550);
    assert.equal(entries[0]!.pickRate, Math.round((300 / 550) * 1e4) / 1e4);
  });

  it('main roles: at least 10 % of the champion games, the most played role always', () => {
    const roles = new MainRoles();
    // Yasuo-like: mid 61 %, top 21 %, adc 17 %, support 1 %.
    for (const [role, n] of [['MIDDLE', 610], ['TOP', 210], ['BOTTOM', 170], ['UTILITY', 10]] as const) roles.count(157, role, n);
    // A one-trick role, and a champion spread thinly over five roles.
    roles.count(28, 'JUNGLE', 970);
    roles.count(28, 'BOTTOM', 3);
    for (const role of ROLES) roles.count(1, role, 20);
    const main = roles.resolve();
    assert.deepEqual([...main.get(157)!], ['MIDDLE', 'TOP', 'BOTTOM']);
    assert.deepEqual([...main.get(28)!], ['JUNGLE']);
    assert.equal(main.get(1)!.size, 5);
    assert.ok(!roles.isMain(157, 'UTILITY'));
    assert.ok(roles.isMain(157, 'UTILITY', 0.01), 'threshold is configurable');
  });

  it('off-role picks (under 10 % of the champion games) are neither ranked nor listed as unranked', () => {
    // Champion 8: 2 000 jungle games, 210 ADC games (9.5 %) and 150 mid games (6.4 %), all in the Diamond band.
    const [, mid] = filesOf([...games('DIAMOND', 8, 'JUNGLE', 2000, 1000), ...games('DIAMOND', 8, 'BOTTOM', 210, 150), ...games('DIAMOND', 8, 'MIDDLE', 150, 90)]);
    tierListSchema.parse(mid);
    assert.deepEqual(mid!.champions.filter((c) => c.championId === 8).map((c) => c.role), ['jungle']);
    assert.ok(!mid!.unranked.some((c) => c.championId === 8));
  });

  it('main roles are shared by every band: a role played only in one band still counts as main elsewhere', () => {
    const [low, mid] = filesOf([...games('GOLD', 9, 'TOP', 300, 150), ...games('EMERALD', 9, 'MIDDLE', 250, 130)]);
    assert.deepEqual(low!.champions.filter((c) => c.championId === 9).map((c) => c.role), ['top']);
    assert.deepEqual(mid!.champions.filter((c) => c.championId === 9).map((c) => c.role), ['mid']);
  });

  it('games of a band never count in another band', () => {
    const [low, mid, elite] = filesOf([...games('GOLD', 3, 'BOTTOM', 250, 140), ...games('PLATINUM', 4, 'BOTTOM', 220, 100), ...games('CHALLENGER', 5, 'BOTTOM', 210, 105)]);
    const ids = (f: typeof low) => f!.champions.filter((c) => c.role === 'adc' && c.championId < 900).map((c) => c.championId);
    assert.deepEqual(ids(low), [3]);
    assert.deepEqual(ids(mid), [4]);
    assert.deepEqual(ids(elite), [5]);
    assert.deepEqual([low!.totalGames, mid!.totalGames, elite!.totalGames], [250, 220, 210]);
  });

  it("a collected player counts in the band of his own tier, the others in the game's band", () => {
    // Games found from a Gold player, but the mid laner is a known Diamond player.
    const [low, mid] = filesOf(games('GOLD', 6, 'MIDDLE', 200, 100, 'DIAMOND'));
    assert.ok(!low!.champions.some((c) => c.championId === 6) && !low!.unranked.some((c) => c.championId === 6));
    assert.equal(mid!.champions.find((c) => c.championId === 6)?.games, 200);
    assert.equal(low!.totalGames, 180); // 9 participants of 10 per game
    assert.equal(mid!.totalGames, 20);
  });

  it('bands and build filters of every tier', () => {
    assert.deepEqual(['IRON', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'CHALLENGER'].map((t) => bandOf(t as SampledTier)), ['low', 'low', 'mid', 'mid', 'mid', 'elite', 'elite']);
    assert.deepEqual(filtersForTier('PLATINUM'), []);
    assert.deepEqual(filtersForTier('GOLD'), []);
    assert.deepEqual(filtersForTier('EMERALD'), ['emerald_plus', 'emerald']);
  });
});

// ---------- Sampled bands in the crawler ----------

const FIXTURES = new URL('../fixtures/', import.meta.url);
const fixtures = Object.fromEntries(
  readdirSync(FIXTURES)
    .filter((f) => f.startsWith('TEST_'))
    .map((f) => {
      const g = JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8'));
      return [g.match.metadata.matchId, g];
    })
);
const items = JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8'));
const ddragonFetch = (async (input: URL | RequestInfo) => {
  const url = String(input);
  if (url.endsWith('versions.json')) return jsonResponse(['16.22.1', '16.21.1']);
  if (url.endsWith('item.json')) return jsonResponse(items);
  throw new Error(`unexpected ${url}`);
}) as typeof fetch;

/** Only a Gold player (puuid-3, in every fixture game) is in the leagues: no Emerald+ player in the games. */
function goldOnlyRiot(calls: string[]): typeof fetch {
  return (async (input: URL | RequestInfo) => {
    const url = new URL(String(input));
    const p = url.pathname;
    calls.push(`${p}?${url.searchParams}`);
    if (p.includes('challengerleagues') || p.includes('grandmasterleagues') || p.includes('masterleagues')) return jsonResponse({ tier: 'X', entries: [] });
    if (p.includes('/entries/'))
      return jsonResponse(p.endsWith('GOLD/I') && url.searchParams.get('page') === '1' ? [{ puuid: 'puuid-3', leaguePoints: 1, wins: 1, losses: 1, tier: 'GOLD', queueType: 'RANKED_SOLO_5x5' }] : []);
    if (p.endsWith('/ids')) return jsonResponse(Object.keys(fixtures).slice(0, Number(url.searchParams.get('count'))));
    const id = p.split('/')[5]!;
    if (p.endsWith('/timeline')) return jsonResponse(fixtures[id].timeline);
    return jsonResponse(fixtures[id].match);
  }) as typeof fetch;
}

describe('crawl of a sampled band', () => {
  it('lists a few league pages, respects the game budget and skips the timeline without an Emerald+ player', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lol-stats-'));
    try {
      const store = new FileStateStore(dir);
      const clock = fakeClock(Date.UTC(2026, 10, 11));
      const calls: string[] = [];
      const client = new RiotClient({ apiKey: 'RGAPI-test', clock, limiter: new RateLimiter(clock), fetch: goldOnlyRiot(calls) });
      const config = loadConfig({
        apiKey: 'RGAPI-test',
        platforms: ['EUW1'],
        pagesPerDivision: 1,
        budgetMinutes: 60,
        maxGames: 0,
        pools: { low: { pages: 1, games: 3, gamesPerPlayer: 4 }, mid: { pages: 1, games: 0, gamesPerPlayer: 4 } },
      });
      const [report] = await crawl(config, { client, store, ddragon: new DataDragon(ddragonFetch), now: clock.now });
      assert.deepEqual(report!.bands, { low: { players: 1, crawled: 1, newGames: 3 } });
      assert.equal(report!.newGames, 3);
      assert.ok(calls.some((c) => c.includes('/ids') && c.includes('count=4')), 'at most 4 games per sampled player');
      assert.ok(!calls.some((c) => c.includes('/timeline')), 'no timeline for a game without an Emerald+ player');
      assert.ok(!calls.some((c) => c.includes('PLATINUM')), 'band without budget not listed');
      assert.ok(!calls.some((c) => c.includes('GOLD/I?page=2') || (c.includes('GOLD/I?') && c.includes('page=2'))), 'one page per division');

      const [file] = await store.list(gamesPrefix('16.22'));
      const saved = [...decodeJsonl<GameRecord>((await store.get(file!))!)];
      assert.equal(saved.length, 3);
      assert.ok(saved.every((g) => g.tier === 'GOLD' && g.participants.find((p) => p.puuid === 'puuid-3')?.tier === 'GOLD'));
      assert.ok(saved.every((g) => g.participants.every((p) => p.majors.length === 0)), 'light record: no item phases');
      assert.ok(await store.get('rotation/EUW1-low.json'), 'own rotation');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
