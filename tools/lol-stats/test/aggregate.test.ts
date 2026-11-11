import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { aggregate } from '../src/aggregate/aggregate.ts';
import { selectBuilds, type BuildCandidate } from '../src/aggregate/builds.ts';
import { Histogram, tierRanks, tierScores, wilsonLower, zScores } from '../src/aggregate/stats.ts';
import { filtersForTier } from '../src/config.ts';
import { extractGame, type GameRecord } from '../src/extract/game.ts';
import { buildItemCatalog } from '../src/extract/items.ts';
import { championBuildSchema, indexSchema } from '../src/schema.ts';

describe('statistics', () => {
  it('Wilson lower bound', () => {
    assert.equal(wilsonLower(0, 0), 0);
    assert.ok(Math.abs(wilsonLower(50, 100) - 0.4038) < 0.001);
    assert.ok(wilsonLower(55, 100) < 0.55);
    // More games with the same win rate → tighter (higher) lower bound.
    assert.ok(wilsonLower(550, 1000) > wilsonLower(55, 100));
  });

  it('z-scores and tiers by percentile', () => {
    assert.deepEqual(zScores([1, 1, 1]), [0, 0, 0]);
    const z = zScores([1, 2, 3]);
    assert.ok(z[0]! < 0 && z[1] === 0 && z[2]! > 0);
    const ranks = tierRanks(Array.from({ length: 20 }, (_, i) => 20 - i)); // best first
    assert.equal(ranks[0], 'S+');
    assert.deepEqual(ranks.slice(1, 4), ['S', 'S', 'S']);
    assert.equal(ranks[19], 'D');
    // Win rate dominates the score; pick and ban rates break ties.
    const s = tierScores([
      { wins: 540, games: 1000, pickRate: 0.05, banRate: 0.01 },
      { wins: 480, games: 1000, pickRate: 0.05, banRate: 0.01 },
      { wins: 500, games: 1000, pickRate: 0.2, banRate: 0.3 },
    ]);
    assert.ok(s[0]! > s[1]!);
    assert.ok(s[2]! > s[1]!);
  });

  it('median from a histogram', () => {
    const h = new Histogram(10_000);
    for (const v of [300_000, 310_000, 320_000, 900_000]) h.add(v);
    assert.equal(h.median(), 315_000);
    assert.equal(new Histogram(10).median(), null);
  });

  it('tier filters are nested', () => {
    assert.deepEqual(filtersForTier('EMERALD'), ['emerald_plus']);
    assert.deepEqual(filtersForTier('MASTER'), ['emerald_plus', 'diamond_plus', 'master_plus']);
    assert.deepEqual(filtersForTier('CHALLENGER'), ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger']);
  });
});

const candidate = (key: string, games: number, wins: number, order = key): BuildCandidate => ({ key, games, wins, orders: new Map([[order, games]]) });

describe('three distinct builds', () => {
  const rules = { minBuildGames: 100, minBuildShare: 0.03 };

  it('most played, best Wilson win rate, then an alternative with a new core item', () => {
    const builds = selectBuilds(
      [
        candidate('1-2-3', 1000, 500, '3-1-2'),
        candidate('1-2-4', 400, 230),
        candidate('1-2-5', 300, 150), // same as 1 and 2 except item 5 → valid alternative
        candidate('1-3-4', 350, 180), // only items already used → not an alternative
        candidate('7-8-9', 99, 70), // under the 100-game threshold
      ],
      4000,
      rules
    );
    assert.deepEqual(
      builds.map((b) => [b.label, b.key]),
      [
        ['most_played', '1-2-3'],
        ['best_winrate', '1-2-4'],
        ['alternative', '1-2-5'],
      ]
    );
    assert.deepEqual(builds[0]!.core, [3, 1, 2], 'most frequent purchase order');
  });

  it('applies max(100 games, 3 % of the champion games) and never fills with small builds', () => {
    assert.equal(selectBuilds([candidate('1-2-3', 250, 130)], 10_000, rules).length, 0, '3 % of 10 000 = 300');
    assert.equal(selectBuilds([candidate('1-2-3', 300, 130), candidate('4-5-6', 150, 90)], 10_000, rules).length, 1);
    assert.deepEqual(selectBuilds([], 1000, rules), []);
  });

  it('a build with a better raw win rate but a tiny sample loses to a solid one', () => {
    const builds = selectBuilds([candidate('1-2-3', 2000, 1000), candidate('1-2-4', 120, 72), candidate('1-2-5', 1500, 840)], 5000, { minBuildGames: 100, minBuildShare: 0 });
    assert.equal(builds[1]!.key, '1-2-5', '56 % on 1500 games beats 60 % on 120 games (Wilson)');
  });
});

describe('aggregate on real games', () => {
  const FIXTURES = new URL('../fixtures/', import.meta.url);
  const catalog = buildItemCatalog(JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data);
  const games = readdirSync(FIXTURES)
    .filter((f) => f.startsWith('TEST_'))
    .map((f) => {
      const { match, timeline } = JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8'));
      return extractGame(match, timeline, { patch: '16.22', platform: 'EUW1', tier: 'MASTER', catalog, minDurationS: 900 }) as GameRecord;
    });
  const names = { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } };

  it('produces schema-valid files and indexes for each filter of the game tier', async () => {
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => games,
      playerTier: new Map(),
      previous: new Map(),
      names,
      config: { minBuildGames: 1, minBuildShare: 0, minMatchupGames: 1, minPlayerGames: 1, lowSampleGames: 500 },
    });
    assert.deepEqual([...out.totals.keys()].sort(), ['diamond_plus|all', 'emerald_plus|all', 'master_plus|all']);
    assert.equal(out.totals.get('master_plus|all'), 5);
    const championRoles = new Set(games.flatMap((g) => g.participants.map((p) => `${p.champion}|${p.role}`))).size;
    assert.equal(out.files.length, 3 * championRoles, 'one file per champion-role and per filter');
    for (const f of out.files) {
      championBuildSchema.parse(f);
      assert.ok(f.lowSample);
      assert.ok(f.summary.fr.startsWith('Sur le patch 16.22'));
      assert.ok(f.summary.en.startsWith('On patch 16.22'));
      assert.ok(Buffer.byteLength(JSON.stringify(f)) < 30 * 1024);
    }
    for (const i of out.indexes) indexSchema.parse(i);
    // Each game has 5 winners and 5 losers.
    const one = out.files.filter((f) => f.filter === 'master_plus');
    assert.equal(one.reduce((n, f) => n + f.wins, 0), 25);
  });
});
