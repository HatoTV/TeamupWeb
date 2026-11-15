import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { aggregate } from '../src/aggregate/aggregate.ts';
import { buildKey, mainItems, nextSlots, selectBuilds, type BuildCandidate } from '../src/aggregate/builds.ts';
import { Histogram, tierRanks, tierScores, wilsonLower, zScores } from '../src/aggregate/stats.ts';
import { filtersForTier } from '../src/config.ts';
import { extractGame, type GameRecord } from '../src/extract/game.ts';
import { buildItemCatalog, exclusiveGroups, type ExclusiveGroups } from '../src/extract/items.ts';
import { championBuildSchema, indexSchema, shownItems } from '../src/schema.ts';

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

const RUNES_A = [8000, 8010, 9111, 9104, 8299, 8400, 8444, 8451, 5008, 5008, 5011];
const RUNES_B = [8100, 8112, 8143, 8138, 8135, 8200, 8226, 8237, 5008, 5008, 5011];
/** Participant with main items bought one minute apart (boots as the tier-2 pair when given). */
const player = (items: number[], runes = RUNES_A, boots: [number, number] | null = null) => ({ majors: items.map((id, i) => [id, (i + 10) * 60_000] as [number, number]), boots, runes });
const candidate = (key: string, games: number, wins: number, order = key.split('|')[0]!): BuildCandidate => ({ key, games, wins, orders: new Map([[order, games]]) });
const RULES = { minBuildGames: 50, minBuildShare: 0.03, offMetaMinShare: 0.005, offMetaMaxShare: 0.03, offMetaMinGames: 30 };
const SLOT_RULES = { altMinShare: 0.08, lateShare: 0.7 };
const slotMap = (entries: Array<[number, number, number?]>) => new Map(entries.map(([item, games, wins]) => [item, { games, wins: wins ?? Math.round(games / 2) }]));

describe('build keys', () => {
  it('same trio in another order = same key; another rune page = another key', () => {
    const a = buildKey(player([3146, 4645, 3157]));
    assert.equal(a, buildKey(player([3157, 3146, 4645])));
    assert.equal(a, '3146-3157-4645|8010-8400');
    assert.notEqual(a, buildKey(player([3146, 4645, 3157], RUNES_B)));
    assert.notEqual(a, buildKey(player([3146, 4645, 3157], [8000, 8010, 9111, 9104, 8299, 8200, 8226, 8237, 5008, 5008, 5011])), 'other secondary tree');
  });

  it('counts tier-2 boots in the trio, in real purchase order', () => {
    // Boots bought at 10:30, between the first (10:00) and the second (11:00) item.
    const p = player([3146, 4645, 3157], RUNES_A, [3020, 630_000]);
    assert.deepEqual(mainItems(p), [3146, 3020, 4645, 3157]);
    assert.equal(buildKey(p), '3020-3146-4645|8010-8400');
  });

  it('games under three main items have no key', () => {
    assert.equal(buildKey(player([3146], RUNES_A, [3020, 1])), null);
    assert.equal(buildKey(player([3146, 4645])), null);
  });
});

describe('four builds', () => {
  it('three most played above max(50, 3 %), then the OFF-META with the best Wilson lower bound', () => {
    const builds = selectBuilds(
      [
        candidate('1-2-3|8010-8400', 1000, 500, '3-1-2'),
        candidate('1-2-3|8008-8400', 400, 210), // same trio, other keystone: another build
        candidate('1-2-5|8010-8400', 300, 150),
        candidate('1-3-4|8010-8400', 290, 150), // fourth most played: not shown as a most played build
        candidate('7-8-9|8010-8400', 60, 40), // 1.5 %, 66.7 % on 60 games
        candidate('6-8-9|8010-8400', 90, 54), // 2.25 %, 60 % on 90 games: lower Wilson bound (0.497 < 0.541)
        candidate('5-8-9|8010-8400', 25, 22), // under 30 games
      ],
      { games: 4000, wins: 2000 },
      RULES
    );
    assert.deepEqual(
      builds.map((b) => [b.label, b.key]),
      [
        ['most_played', '1-2-3|8010-8400'],
        ['second_most_played', '1-2-3|8008-8400'],
        ['third_most_played', '1-2-5|8010-8400'],
        ['off_meta', '7-8-9|8010-8400'],
      ]
    );
    assert.deepEqual(builds[0]!.core, [3, 1, 2], 'most frequent purchase order');
    assert.equal(builds[1]!.keystone, 8008);
    assert.equal(builds[1]!.subStyle, 8400);
  });

  it('OFF-META needs 0.5 %-3 % of the games, 30 games and a win rate above the champion average', () => {
    const top = [candidate('1-2-3|1-2', 3000, 1500), candidate('1-2-4|1-2', 2000, 1000), candidate('1-2-5|1-2', 1000, 500)];
    const champ = { games: 10_000, wins: 5200 }; // 52 % on average
    const off = (c: BuildCandidate) => selectBuilds([...top, c], champ, RULES).find((b) => b.label === 'off_meta')?.key ?? null;
    assert.equal(off(candidate('7-8-9|1-2', 40, 30)), null, '0.4 %: below 0.5 %');
    assert.equal(off(candidate('7-8-9|1-2', 400, 300)), null, '4 %: above 3 %');
    assert.equal(off(candidate('7-8-9|1-2', 120, 62)), null, '51.7 %: not above the 52 % average');
    assert.equal(off(candidate('7-8-9|1-2', 120, 70)), '7-8-9|1-2');
    assert.equal(selectBuilds(top, champ, RULES).length, 3, 'absent when no key qualifies');
  });

  it('most played builds need max(50 games, 3 % of the champion games); never filled with small builds', () => {
    assert.equal(selectBuilds([candidate('1-2-3|1-2', 250, 130)], { games: 10_000, wins: 5000 }, RULES).length, 0, '3 % of 10 000 = 300, and no OFF-META without a most played build');
    assert.equal(selectBuilds([candidate('1-2-3|1-2', 49, 30)], { games: 500, wins: 250 }, RULES).length, 0, 'under 50 games');
    assert.deepEqual(selectBuilds([], { games: 1000, wins: 500 }, RULES), []);
  });
});

describe('items 4 to 6', () => {
  const none: ExclusiveGroups = new Map();

  it('never repeats an item: core, slots and alternatives', () => {
    // Real Akali case of the previous algorithm: Rabadon (3089) shown 5th and 6th.
    const slots = [slotMap([[3089, 120], [3157, 80], [3135, 60], [3146, 40]]), slotMap([[3089, 90], [3135, 70], [3157, 50]]), slotMap([[3089, 50], [3135, 40], [3102, 30]])];
    const next = nextSlots([3146, 4645, 3020], slots, 400, none, SLOT_RULES);
    assert.deepEqual(
      next.map((s) => [s.slot, s.item]),
      [
        [4, 3089],
        [5, 3135],
        [6, 3102],
      ]
    );
    assert.deepEqual(next[0]!.alternatives.map((a) => a.item), [3157], '3135 is the 5th item, 3146 is in the core');
    const all = [3146, 4645, 3020, ...next.flatMap((s) => [s.item, ...s.alternatives.map((a) => a.item)])];
    assert.equal(new Set(all).size, all.length);
  });

  it('alternatives: at most 2, at least 8 % of the build games, with share and win rate', () => {
    const slots = [slotMap([[10, 50, 30], [11, 30, 20], [12, 20], [13, 15], [14, 7]]), new Map(), new Map()];
    const [four] = nextSlots([1, 2, 3], slots, 100, none, SLOT_RULES);
    assert.equal(four!.share, 0.5);
    assert.equal(four!.winRate, 0.6);
    assert.deepEqual(four!.alternatives.map((a) => [a.item, a.share]), [
      [11, 0.3],
      [12, 0.2],
    ]);
    const [low] = nextSlots([1, 2, 3], [slotMap([[10, 50], [14, 7]]), new Map(), new Map()], 100, none, SLOT_RULES);
    assert.deepEqual(low!.alternatives, [], '7 % < 8 %');
  });

  it('respects exclusive groups: one pair of boots, one Tear item, one Lifeline item', () => {
    const groups: ExclusiveGroups = new Map([
      [3020, ['boots']],
      [3111, ['boots']],
      [3004, ['tear']],
      [3003, ['tear']],
      [3053, ['Lifeline']],
      [3156, ['Lifeline']],
    ]);
    const slots = [slotMap([[3111, 90], [3053, 60], [3156, 40]]), slotMap([[3003, 70], [3156, 60], [3071, 30]]), slotMap([[3071, 50]])];
    const next = nextSlots([3020, 3004, 6692], slots, 300, groups, SLOT_RULES);
    assert.equal(next[0]!.item, 3053, 'second boots skipped');
    assert.deepEqual(next[0]!.alternatives.map((a) => a.item), [3156], 'an alternative may replace its own slot item');
    assert.equal(next[1]!.item, 3071, 'second Tear item skipped, Lifeline taken by slot 4');
    assert.equal(next.length, 2, 'nothing left for slot 6');
  });

  it('an item bought 6th in more than 70 % of the cases is not proposed 4th', () => {
    const slots = [slotMap([[3026, 50], [3036, 40]]), slotMap([[3036, 20]]), slotMap([[3026, 200]])];
    const next = nextSlots([1, 2, 3], slots, 400, none, SLOT_RULES);
    assert.equal(next[0]!.item, 3036);
    assert.ok(!next[0]!.alternatives.some((a) => a.item === 3026));
    assert.equal(next.find((s) => s.slot === 6)?.item, 3026);
  });
});

describe('exclusive groups from Data Dragon', () => {
  it('boots, Tear items and shared unique passives', () => {
    const rift = { maps: { '11': true } };
    const groups = exclusiveGroups({
      '1001': { ...rift, tags: ['Boots'], into: ['3020'] },
      '3020': { ...rift, tags: ['Boots'], from: ['1001'] },
      '3070': { ...rift, into: ['3004'] },
      '3004': { ...rift, from: ['3070'], description: '<passive>Awe</passive>' },
      '3053': { ...rift, description: '<passive>Lifeline</passive>' },
      '3156': { ...rift, description: '<passive>Lifeline</passive>' },
      '3165': { ...rift, description: '<passive>Grievous Wounds</passive>' },
      '3033': { ...rift, description: '<passive>Grievous Wounds</passive>' },
    });
    assert.deepEqual(groups.get(3020), ['boots']);
    assert.deepEqual(groups.get(3004), ['tear']);
    assert.deepEqual(groups.get(3053), ['Lifeline']);
    assert.equal(groups.get(3165), undefined, 'a shared effect is not an exclusive group');
  });
});

describe('real case: Akali top (patch 16.22 sample)', () => {
  const fixture = JSON.parse(readFileSync(new URL('../fixtures/akali-top-16.22.json', import.meta.url), 'utf8'));
  const game = (p: unknown, i: number): GameRecord => ({ id: `A_${i}`, platform: 'EUW1', patch: '16.22', tier: 'MASTER', durationS: 1800, bans: [], participants: [{ puuid: '', riotId: '', opponent: null, mates: {}, fullBuild: [], ...(p as object) } as unknown as GameRecord['participants'][number]] });

  it('no item is shown twice in any build', async () => {
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => fixture.participants.map(game),
      previous: new Map(),
      names: { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } },
      exclusive: new Map([[3020, ['boots']], [3047, ['boots']], [3111, ['boots']], [3158, ['boots']], [3006, ['boots']], [3009, ['boots']]]),
      config: { ...RULES, ...SLOT_RULES, minBuildGames: 5, offMetaMinGames: 3, minMatchupGames: 1, lowSampleGames: 200 },
    });
    const file = out.files.find((f) => f.filter === 'master_plus')!;
    championBuildSchema.parse(file);
    assert.ok(file.builds.length >= 3);
    for (const b of file.builds) {
      const shown = shownItems(b);
      assert.equal(new Set(shown).size, shown.length, `${b.label}: ${shown.join(', ')}`);
    }
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
      previous: new Map(),
      names,
      exclusive: new Map(),
      config: { ...RULES, ...SLOT_RULES, minBuildGames: 1, minBuildShare: 0, minMatchupGames: 1, lowSampleGames: 500 },
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
