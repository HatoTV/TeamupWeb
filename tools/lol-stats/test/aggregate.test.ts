import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { aggregate } from '../src/aggregate/aggregate.ts';
import { bootsSlot, buildKey, isDistinct, nextSlots, selectBuilds, type BuildCandidate } from '../src/aggregate/builds.ts';
import { Histogram, tierRanks, tierScores, wilsonLower, zScores } from '../src/aggregate/stats.ts';
import { filtersForTier } from '../src/config.ts';
import { extractGame, type GameRecord } from '../src/extract/game.ts';
import { buildItemCatalog, exclusiveGroups, type ExclusiveGroups } from '../src/extract/items.ts';
import { championBuildSchema, indexSchema, repeatedItems } from '../src/schema.ts';

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

  it('tier filters are nested, plus the exact tier', () => {
    assert.deepEqual(filtersForTier('EMERALD'), ['emerald_plus', 'emerald']);
    assert.deepEqual(filtersForTier('MASTER'), ['emerald_plus', 'diamond_plus', 'master_plus', 'master']);
    assert.deepEqual(filtersForTier('CHALLENGER'), ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger']);
  });
});

const RUNES_A = [8000, 8010, 9111, 9104, 8299, 8400, 8444, 8451, 5008, 5008, 5011];
const RUNES_B = [8100, 8112, 8143, 8138, 8135, 8200, 8226, 8237, 5008, 5008, 5011];
/** Participant with main items bought one minute apart (boots as the tier-2 pair when given). */
const player = (items: number[], runes = RUNES_A, boots: [number, number] | null = null) => ({ majors: items.map((id, i) => [id, (i + 10) * 60_000] as [number, number]), boots, runes });
const candidate = (key: string, games: number, wins: number, order = key.split('|')[0]!): BuildCandidate => ({ key, games, wins, orders: new Map([[order, games]]) });
const RULES = { minBuildGames: 50, minBuildShare: 0.03, offMetaMinShare: 0.005, offMetaMinGames: 30, offMetaWinRateGap: 0.01 };
const SLOT_RULES = { altMinShare: 0.08, altMinGames: 3, lateShare: 0.7 };
const slotMap = (entries: Array<[number, number, number?]>) => new Map(entries.map(([item, games, wins]) => [item, { games, wins: wins ?? Math.round(games / 2) }]));

describe('build keys', () => {
  it('same two core items in another order = same key; another keystone or secondary tree = another key', () => {
    const a = buildKey(player([3146, 4645, 3157]));
    assert.equal(a, buildKey(player([4645, 3146, 3089])), 'third item not in the key');
    assert.equal(a, '3146-4645|8010-8400');
    assert.notEqual(a, buildKey(player([3146, 4645, 3157], RUNES_B)));
    assert.notEqual(a, buildKey(player([3146, 4645, 3157], [8000, 8010, 9111, 9104, 8299, 8200, 8226, 8237, 5008, 5008, 5011])), 'other secondary tree');
    assert.equal(a, buildKey(player([3146, 4645], [8000, 8010, 9101, 9105, 8014, 8400, 8473, 8242, 5005, 5008, 5001])), 'other minor runes: same build');
  });

  it('boots are never in the key', () => {
    // Boots bought at 10:30, between the first (10:00) and the second (11:00) item.
    const p = player([3146, 4645, 3157], RUNES_A, [3020, 630_000]);
    assert.equal(buildKey(p), '3146-4645|8010-8400');
    assert.equal(buildKey(p), buildKey(player([3146, 4645], RUNES_A, [3111, 1])), 'other boots: same build');
  });

  it('games under two completed major items have no key', () => {
    assert.equal(buildKey(player([3146], RUNES_A, [3020, 1])), null);
    assert.equal(buildKey(player([])), null);
  });
});

describe('four builds', () => {
  it('most played, best win rate, then an alternative and an OFF-META that are distinct from the other builds', () => {
    const builds = selectBuilds(
      [
        candidate('1-2|8010-8400', 1000, 500, '2-1'),
        candidate('1-2|8008-8400', 400, 220), // same core, other keystone: 55 %, best win rate
        candidate('1-2|8010-8200', 350, 180), // same keystone and first item as the most played: not distinct
        candidate('1-5|8010-8400', 320, 150), // first item 1 in the other cores, keystone used: not distinct
        candidate('1-5|8010-8300', 310, 150, '5-1'), // first item 5 bought by no other build: alternative
        candidate('3-4|8010-8400', 290, 150), // distinct but fewer games than the alternative
        candidate('7-8|8021-8400', 60, 40), // 1.5 %, 66.7 % on 60 games
        candidate('6-8|8021-8400', 90, 54), // 2.25 %, 60 % on 90 games: lower Wilson bound (0.497 < 0.541)
        candidate('1-9|8010-8400', 60, 50), // first item in the most played core, keystone used: not distinct
        candidate('5-9|8010-8400', 60, 50, '9-5'), // would put the alternative's first item in a core: not OFF-META
        candidate('5-8-9|8021-8400', 25, 22), // under 30 games
      ],
      { games: 4000, wins: 2000 },
      RULES
    );
    assert.deepEqual(
      builds.map((b) => [b.label, b.key]),
      [
        ['most_played', '1-2|8010-8400'],
        ['best_win_rate', '1-2|8008-8400'],
        ['alternative', '1-5|8010-8300'],
        ['off_meta', '7-8|8021-8400'],
      ]
    );
    assert.deepEqual(builds[0]!.core, [2, 1], 'most frequent purchase order');
    assert.deepEqual(builds[2]!.core, [5, 1]);
    assert.equal(builds[1]!.keystone, 8008);
    assert.equal(builds[1]!.subStyle, 8400);
  });

  it('distinct = a keystone used by no other build, or a first item in no other core', () => {
    const b = (keystone: number, core: number[]) => ({ keystone, core });
    const others = [b(1, [10, 11]), b(2, [10, 12])];
    assert.equal(isDistinct(b(3, [10, 11]), others), true, 'other keystone, same items');
    assert.equal(isDistinct(b(1, [13, 10]), others), true, 'same keystone, new first item');
    assert.equal(isDistinct(b(1, [12, 13]), others), false, 'first item in the second core');
    assert.equal(isDistinct(b(2, [11, 13]), others), false, 'first item in the first core');
  });

  it('the alternative is a reliable build; a slot without a qualifying key is left out', () => {
    const champ = { games: 4000, wins: 2000 };
    const labels = (cs: BuildCandidate[]) => selectBuilds(cs, champ, RULES).map((b) => `${b.label}:${b.key}`);
    assert.deepEqual(
      labels([candidate('1-2|1-2', 1000, 500), candidate('3-4|1-2', 100, 90), candidate('1-2|3-2', 200, 90)]),
      ['most_played:1-2|1-2', 'best_win_rate:1-2|3-2', 'off_meta:3-4|1-2'],
      '3-4 under 3 % (120 games): OFF-META, not alternative; 1-2|3-2 same items, other keystone'
    );
    assert.deepEqual(labels([candidate('1-2|1-2', 1000, 500), candidate('1-3|1-2', 300, 160)]), ['most_played:1-2|1-2', 'best_win_rate:1-3|1-2'], 'the only other build is the best win rate one');
  });

  it('OFF-META needs 0.5 % of the games, 30 games, at most 1 point under the champion win rate, and to be distinct', () => {
    const top = [candidate('1-2|1-2', 3000, 1500), candidate('1-3|1-2', 2000, 1000), candidate('1-4|1-2', 1000, 500)];
    const champ = { games: 10_000, wins: 5200 }; // 52 % on average
    const pick = (c: BuildCandidate, label = 'off_meta') => selectBuilds([...top, c], champ, RULES).find((b) => b.label === label)?.key ?? null;
    assert.equal(pick(candidate('7-8|5-2', 40, 30)), null, '0.4 %: below 0.5 %');
    assert.equal(pick(candidate('7-8|5-2', 400, 200), 'alternative'), '7-8|5-2', '4 %: reliable, so the alternative');
    assert.equal(pick(candidate('7-8|5-2', 120, 60)), null, '50 %: more than 1 point under the 52 % average');
    assert.equal(pick(candidate('7-8|5-2', 120, 62)), '7-8|5-2', '51.7 %: within 1 point');
    assert.equal(pick(candidate('1-8|1-6', 120, 70)), null, 'keystone and first item of the most played build');
    assert.equal(pick(candidate('1-8|5-2', 120, 70)), '1-8|5-2', 'other keystone only');
    assert.equal(pick(candidate('1-8|1-6', 120, 70, '8-1')), '1-8|1-6', 'other first item only');
    assert.equal(selectBuilds(top, champ, RULES).length, 2, 'absent when no key qualifies');
  });

  it('builds need max(50 games, 3 % of the champion games); never filled with small builds', () => {
    assert.equal(selectBuilds([candidate('1-2|1-2', 250, 130)], { games: 10_000, wins: 5000 }, RULES).length, 0, '3 % of 10 000 = 300, and no OFF-META without a most played build');
    assert.equal(selectBuilds([candidate('1-2|1-2', 49, 30)], { games: 500, wins: 250 }, RULES).length, 0, 'under 50 games');
    assert.deepEqual(selectBuilds([], { games: 1000, wins: 500 }, RULES), []);
  });
});

describe('items 4 to 6', () => {
  const none: ExclusiveGroups = new Map();

  it('main line without duplicate; alternatives = other items most bought at each slot', () => {
    // Real Akali case of the previous algorithm: Rabadon (3089) shown 5th and 6th as main item.
    const slots = [slotMap([[3089, 120], [3157, 80], [3135, 60], [3146, 40]]), slotMap([[3089, 90], [3135, 70], [3157, 50]]), slotMap([[3089, 50], [3135, 40], [3102, 30]])];
    const next = nextSlots([3146, 4645], slots, 400, none, SLOT_RULES);
    assert.deepEqual(
      next.map((s) => [s.slot, s.item, s.alternatives.map((a) => a.item)]),
      [
        [3, 3089, [3157, 3135]],
        [4, 3135, [3089, 3157]],
        [5, 3102, [3089, 3135]],
      ],
      '3146 is in the core: never an alternative'
    );
    assert.deepEqual(repeatedItems({ core: [3146, 4645], next } as never), []);
  });

  it('alternatives: at most 2, at least 8 % of the slot purchases, with share and win rate', () => {
    const slots = [slotMap([[10, 50, 30], [11, 30, 20], [12, 20], [13, 15], [14, 7]]), new Map(), new Map()];
    const [four] = nextSlots([1, 2], slots, 100, none, SLOT_RULES);
    assert.equal(four!.share, 0.5);
    assert.equal(four!.winRate, 0.6);
    assert.deepEqual(four!.alternatives.map((a) => [a.item, a.share]), [
      [11, 0.3],
      [12, 0.2],
    ]);
    const [low] = nextSlots([1, 2], [slotMap([[10, 50], [14, 4]]), new Map(), new Map()], 100, none, SLOT_RULES);
    assert.deepEqual(low!.alternatives, [], '4 / 54 purchases < 8 %');
  });

  it('late slots get alternatives too: share of the slot purchases and minimum games', () => {
    // 400 games in the build, only 24 reach a 6th item: 10 games is 2.5 % of the build but 42 % of the 6th items.
    const slots = [slotMap([[10, 120], [20, 60]]), slotMap([[20, 70], [30, 60]]), slotMap([[40, 12], [30, 10], [70, 2]])];
    const next = nextSlots([1, 2], slots, 400, none, SLOT_RULES);
    assert.deepEqual(next[2]!.alternatives.map((a) => [a.item, a.share]), [[30, 0.025]], 'item 70: 2 games < 3');
  });

  it('respects exclusive groups: one Tear item, one Lifeline item', () => {
    const groups: ExclusiveGroups = new Map([
      [3020, ['boots']],
      [3111, ['boots']],
      [3004, ['tear']],
      [3003, ['tear']],
      [3053, ['Lifeline']],
      [3156, ['Lifeline']],
    ]);
    const slots = [slotMap([[3003, 90], [3053, 60], [3156, 40]]), slotMap([[3156, 70], [3071, 30]]), slotMap([[3071, 50]])];
    const next = nextSlots([3004, 6692], slots, 300, groups, SLOT_RULES);
    assert.equal(next[0]!.item, 3053, 'second Tear item skipped');
    assert.deepEqual(next[0]!.alternatives.map((a) => a.item), [3156], 'an alternative may replace its own slot item');
    assert.equal(next[1]!.item, 3071, 'second Lifeline item skipped');
    assert.equal(next.length, 2, 'nothing left for slot 5');
  });

  it('an item bought last in more than 70 % of the cases is not proposed 3rd', () => {
    const slots = [slotMap([[3026, 50], [3036, 40]]), slotMap([[3036, 20]]), slotMap([[3026, 200]])];
    const next = nextSlots([1, 2], slots, 400, none, SLOT_RULES);
    assert.equal(next[0]!.item, 3036);
    assert.ok(!next[0]!.alternatives.some((a) => a.item === 3026));
    assert.equal(next.find((s) => s.slot === 5)?.item, 3026);
  });

  it('ADC or no boots: four slots, items 3 to 6', () => {
    const slots = [slotMap([[10, 50], [15, 30]]), slotMap([[20, 40]]), slotMap([[30, 30]]), slotMap([[10, 200], [40, 20]])];
    const next = nextSlots([1, 2], slots, 100, none, SLOT_RULES, 4);
    assert.deepEqual(next.map((s) => [s.slot, s.item]), [[3, 15], [4, 20], [5, 30], [6, 10]], 'item 10, bought last in most games, is not proposed first');
    assert.equal(nextSlots([1, 2], slots, 100, none, SLOT_RULES).at(-1)?.slot, 5, 'three slots by default: items 3 to 5');
  });

  it('boots: most bought, at most 2 alternatives with 8 % of the boots purchases and 3 games', () => {
    const boots = bootsSlot(slotMap([[3020, 60, 33], [3158, 25], [3111, 8], [3047, 4], [3009, 2]]), 100, SLOT_RULES)!;
    assert.deepEqual([boots.item, boots.share, boots.winRate], [3020, 0.6, 0.55]);
    assert.deepEqual(boots.alternatives.map((a) => [a.item, a.share]), [
      [3158, 0.25],
      [3111, 0.08],
    ]);
    assert.deepEqual(bootsSlot(slotMap([[3020, 90], [3047, 5]]), 100, SLOT_RULES)!.alternatives, [], '5 / 95 purchases < 8 %');
    assert.equal(bootsSlot(new Map(), 100, SLOT_RULES), null);
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
    assert.ok(file.builds.length >= 2);
    for (const b of file.builds) {
      assert.deepEqual(repeatedItems(b), [], b.label);
    }
  });

  it('places the boots in the line of items, after the major items most often bought before them', async () => {
    const participants = [
      // Boots after the first major item twice, after the second once.
      { majors: [[3078, 600_000], [3053, 900_000], [3071, 1_200_000]], boots: [3047, 700_000] },
      { majors: [[3078, 650_000], [3053, 950_000], [3071, 1_250_000]], boots: [3047, 800_000] },
      { majors: [[3078, 620_000], [3053, 920_000], [3071, 1_220_000]], boots: [3047, 1_000_000] },
    ].map((p, i) => game({ ...fixture.participants[0], ...p }, i));
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => participants,
      previous: new Map(),
      names: { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } },
      exclusive: new Map(),
      config: { ...RULES, ...SLOT_RULES, minBuildGames: 1, offMetaMinGames: 1, minMatchupGames: 1, lowSampleGames: 200 },
    });
    const build = out.files.find((f) => f.filter === 'master_plus')!.builds[0]!;
    assert.equal(build.boots?.slot, 2);
  });
});

describe('aggregate on real games', () => {
  const FIXTURES = new URL('../fixtures/', import.meta.url);
  const catalog = buildItemCatalog(JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data);
  const games = readdirSync(FIXTURES)
    .filter((f) => f.startsWith('TEST_'))
    .map((f) => {
      const { match, timeline } = JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8'));
      return extractGame(match, timeline, { patches: ['16.22'], platform: 'EUW1', tier: 'MASTER', catalog, minDurationS: 900 }) as GameRecord;
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
    assert.deepEqual([...out.totals.keys()].sort(), ['diamond_plus|all', 'emerald_plus|all', 'master_plus|all', 'master|all']);
    assert.equal(out.totals.get('master_plus|all'), 5);
    const championRoles = new Set(games.flatMap((g) => g.participants.map((p) => `${p.champion}|${p.role}`))).size;
    assert.equal(out.files.length, 4 * championRoles, 'one file per champion-role and per filter');
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

describe('aggregate: main roles only', () => {
  const FIXTURES = new URL('../fixtures/', import.meta.url);
  const catalog = buildItemCatalog(JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data);
  const names = { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } };
  const file = readdirSync(FIXTURES).find((f) => f.startsWith('TEST_'))!;
  const { match, timeline } = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8'));
  const base = extractGame(match, timeline, { patches: ['16.22'], platform: 'EUW1', tier: 'MASTER', catalog, minDurationS: 900 }) as GameRecord;

  it('drops the champion / role pairs under 10 % of the champion games: no file, no index entry, never an opponent', async () => {
    // 10 copies of the game, then one where the top laner and the jungler of the first team swap roles:
    // each of them plays 1 game of 11 (9 %) outside his role.
    const top = base.participants.find((p) => p.role === 'TOP')!;
    const jungle = base.participants.find((p) => p.role === 'JUNGLE' && p.win === top.win)!;
    const copies: GameRecord[] = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `${base.id}_${i}` }));
    const swapped: GameRecord = {
      ...base,
      id: `${base.id}_swap`,
      participants: base.participants.map((p) => (p === top ? { ...p, role: 'JUNGLE' } : p === jungle ? { ...p, role: 'TOP' } : p)),
    };
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => [...copies, swapped],
      previous: new Map(),
      names,
      exclusive: new Map(),
      config: { ...RULES, ...SLOT_RULES, minBuildGames: 1, minBuildShare: 0, minMatchupGames: 1, lowSampleGames: 500 },
    });
    const pairs = (filter: string) => out.files.filter((f) => f.filter === filter).map((f) => `${f.champion}|${f.role}`);
    assert.equal(pairs('master_plus').length, 10, 'only the ten main champion / role pairs');
    assert.ok(!pairs('master_plus').includes(`${top.champion}|jungle`));
    assert.ok(!pairs('master_plus').includes(`${jungle.champion}|top`));
    const index = out.indexes.find((i) => i.filter === 'master_plus')!;
    indexSchema.parse(index);
    assert.deepEqual(index.champions.find((c) => c.champion === top.champion)!.roles.map((r) => r.role), ['top']);
    // The off-role top laner (the jungler) is not an opponent of the enemy top laner.
    const enemyTop = out.files.find((f) => f.filter === 'master_plus' && f.role === 'top' && f.champion !== top.champion)!;
    assert.ok(![...enemyTop.weakAgainst, ...enemyTop.strongAgainst].some((o) => o.champion === jungle.champion));
    assert.ok(enemyTop.weakAgainst.some((o) => o.champion === top.champion) || enemyTop.strongAgainst.some((o) => o.champion === top.champion));
    // Win counts of the kept pairs ignore the off-role game: 10 games each.
    assert.equal(out.files.find((f) => f.filter === 'master_plus' && f.champion === top.champion)!.games, 10);
  });
});

describe('aggregate with the tier of each player', () => {
  const FIXTURES = new URL('../fixtures/', import.meta.url);
  const catalog = buildItemCatalog(JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data);
  const names = { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } };
  const file = readdirSync(FIXTURES).find((f) => f.startsWith('TEST_'))!;
  const { match, timeline } = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8'));
  // Fixtures share anonymised puuids: give each player his own. One Challenger and one Emerald player; the 8 others
  // are not in the collected list.
  match.info.participants.forEach((p: { puuid: string }, i: number) => (p.puuid = `player-${i}`));
  const puuids: string[] = match.info.participants.map((p: { puuid: string }) => p.puuid);
  const challenger = puuids[0]!;
  const emerald = puuids[1]!;
  const tierOf = (puuid: string) => (puuid === challenger ? 'CHALLENGER' : puuid === emerald ? 'EMERALD' : undefined);

  it('counts each player in the filters of his own tier, games weighted per player', async () => {
    const game = extractGame(match, timeline, { patches: ['16.22'], platform: 'EUW1', tier: 'EMERALD', catalog, minDurationS: 900, tierOf }) as GameRecord;
    assert.equal(game.participants.filter((p) => p.tier).length, 2);
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => [game],
      previous: new Map(),
      names,
      exclusive: new Map(),
      config: { ...RULES, ...SLOT_RULES, minBuildGames: 1, minBuildShare: 0, minMatchupGames: 1, lowSampleGames: 500 },
    });
    const challengerFiles = out.files.filter((f) => f.filter === 'challenger');
    assert.equal(challengerFiles.length, 1, 'only the Challenger player counts in Challenger');
    assert.equal(out.files.filter((f) => f.filter === 'emerald').length, 1);
    assert.equal(out.files.filter((f) => f.filter === 'emerald_plus').length, 2);
    assert.equal(out.files.filter((f) => f.filter === 'diamond_plus').length, 1);
    // A single player of the role in the scope: picked in « his » game.
    assert.equal(challengerFiles[0]!.pickRate, 1);
    assert.ok(out.files.every((f) => f.pickRate <= 1 && f.banRate <= 1));
  });
});
