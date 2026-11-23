import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TftChampion, TftItem, TftTrait } from '../../../src/app/tft/logic/tft-types.ts';
import { computeSynergies, synergyLookup } from '../../../src/app/tft/logic/synergies.ts';
import { aggregateQueue } from '../src/aggregate/aggregate.ts';
import { toBoard } from '../src/aggregate/boards.ts';
import { clusterBoards, describeComp } from '../src/aggregate/comps.ts';
import { adjustedAvg, Acc } from '../src/aggregate/stats.ts';
import { unitStats } from '../src/aggregate/units.ts';
import { filtersOfTier, loadConfig, tierOf } from '../src/config.ts';
import { extractMatch, patchOfGameVersion, type BoardRecord, type TftMatchDto } from '../src/extract.ts';
import { setData } from '../src/static.ts';

// ---------- a small set: two comps (« Blades » around Ace, « Guards » around Wall) ----------

const champ = (id: string, cost: number, traits: string[], range = 1): TftChampion => ({
  id,
  short: id.slice(0, 4).toLowerCase().padEnd(4, '0'),
  slug: id.toLowerCase(),
  name: id,
  cost,
  traits,
  icon: null,
  ability: { name: '', desc: '', hasValues: false },
  stats: { hp: 500, damage: 50, armor: 30, magicResist: 30, attackSpeed: 0.7, range, mana: 60, initialMana: 0 },
});
const champions = [
  champ('Ace', 4, ['Blade'], 4),
  champ('Bow', 3, ['Blade'], 4),
  champ('Cut', 2, ['Blade', 'Guard']),
  champ('Dart', 1, ['Blade'], 4),
  champ('Edge', 5, ['Blade', 'Solo'], 4),
  champ('Wall', 4, ['Guard']),
  champ('Rock', 3, ['Guard']),
  champ('Moss', 2, ['Guard']),
  champ('Turf', 1, ['Guard']),
  champ('Tank', 5, ['Guard', 'Solo']),
  { ...champ('Ace (Gold)', 4, ['Blade', 'Solo'], 4), id: 'AceGold', variantOf: 'Ace' },
];
const traits: TftTrait[] = [
  { id: 'Blade', name: 'Blade', icon: null, breakpoints: [{ min: 2, style: 'bronze' }, { min: 4, style: 'silver' }, { min: 6, style: 'gold' }] },
  { id: 'Guard', name: 'Guard', icon: null, breakpoints: [{ min: 2, style: 'bronze' }, { min: 4, style: 'gold' }] },
  { id: 'Solo', name: 'Solo', icon: null, breakpoints: [{ min: 1, style: 'unique' }] },
];
const item = (id: string, kind: TftItem['kind'], extra: Partial<TftItem> = {}): TftItem => ({ id, short: id.slice(0, 4).toLowerCase().padEnd(4, '0'), slug: id.toLowerCase(), name: id, kind, icon: null, ...extra });
const items = [
  item('Sword', 'component'),
  item('Rage', 'complete', { aliases: ['OldRage'] }),
  item('Edge', 'complete'),
  item('Shield', 'complete'),
  item('Vest', 'complete'),
  item('BladeEmblem', 'emblem', { trait: 'Blade' }),
  item('GuardEmblem', 'emblem', { trait: 'Guard' }),
];
const data = setData({ set: 1, champions, traits, items });
const config = loadConfig({ minCompGames: 20, minVariantGames: 5, minItemGames: 5, minHolderGames: 5, minTrioGames: 5, shrinkGames: 10 });

let matchNo = 0;
const board = (placement: number, units: BoardRecord['u'], tier: BoardRecord['t'] = 'DIAMOND', level = 8): BoardRecord => {
  const synergies = computeSynergies(
    units.map(([champion, , unitItems]) => ({ champion, items: unitItems })),
    synergyLookup({ champions, traits, items })
  );
  return { m: `T_${matchNo++}`, q: 'ranked', p: '16.23', t: tier, pl: placement, lv: level, u: units, tr: synergies.map((s) => [s.trait, s.count, s.style ? 2 : 0]), a: [] };
};
const blades = (placement: number, extra: Partial<{ ace: string[]; swap: string }> = {}): BoardRecord =>
  board(placement, [
    ['Ace', 2, extra.ace ?? ['Rage', 'Edge', 'Shield']],
    ['Bow', 2, ['Rage', 'Edge', 'Vest']],
    ['Cut', 2, []],
    [extra.swap ?? 'Dart', 2, []],
    ['Edge', 1, ['Shield']],
    ['Moss', 2, []],
  ]);
const guards = (placement: number): BoardRecord =>
  board(placement, [
    ['Wall', 2, ['Shield', 'Vest', 'Rage']],
    ['Rock', 2, []],
    ['Moss', 2, []],
    ['Turf', 3, []],
    ['Tank', 1, ['Vest']],
    ['Cut', 2, []],
  ]);

test('patch of the game version', () => {
  assert.equal(patchOfGameVersion('Linux Version 16.23.725.2938 (Nov 18 2026/12:00:00) [PUBLIC] <Releases/16.23>'), '16.23');
  assert.equal(patchOfGameVersion('Version 16.9.1.2'), '16.9');
  assert.equal(patchOfGameVersion('garbage'), null);
});

test('extraction keeps ranked / Double Up games of the set, with the tier of each player', () => {
  const dto = (queue: number, set = 1): TftMatchDto => ({
    metadata: { match_id: 'EUW1_1', participants: ['a', 'b'] },
    info: {
      game_datetime: 0,
      game_version: 'Version 16.23.1.1',
      queue_id: queue,
      tft_set_number: set,
      participants: [
        { puuid: 'a', placement: 1, level: 9, traits: [{ name: 'Blade', num_units: 4, style: 2, tier_current: 2 }], units: [{ character_id: 'Ace', tier: 2, itemNames: ['Rage', 'Edge', 'Shield', 'Extra'] }], augments: ['Aug'] },
        { puuid: 'b', placement: 2, level: 8, traits: [], units: [] },
      ],
    },
  });
  const tiers: Record<string, BoardRecord['t']> = { a: 'MASTER' };
  const boards = extractMatch(dto(1100), 1, (p) => tiers[p]);
  assert.ok(Array.isArray(boards));
  assert.equal(boards.length, 2);
  assert.deepEqual(boards[0]!.u, [['Ace', 2, ['Rage', 'Edge', 'Shield']]]);
  assert.equal(boards[0]!.t, 'MASTER');
  assert.equal(boards[1]!.t, 'MASTER', 'unknown player: lowest known tier of the match');
  assert.equal(extractMatch(dto(1090), 1, () => undefined), 'queue');
  assert.equal(extractMatch(dto(1160, 2), 1, () => undefined), 'set');
  assert.equal((extractMatch(dto(1160), 1, () => undefined) as BoardRecord[])[0]!.q, 'double_up');
});

test('rank filters of a tier', () => {
  assert.deepEqual(filtersOfTier('PLATINUM'), ['platinum_plus']);
  assert.deepEqual(filtersOfTier('DIAMOND'), ['platinum_plus', 'emerald_plus', 'diamond_plus']);
  assert.deepEqual(filtersOfTier('CHALLENGER'), ['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus']);
});

test('board: forms fold into their champion, aliases map to the item, main trait and carry', () => {
  const b = toBoard(board(3, [['AceGold', 2, ['OldRage', 'Edge', 'Unknown']], ['Bow', 2, ['Rage']], ['Cut', 1, []], ['Dart', 1, []]]), data);
  assert.deepEqual(b.units[0], { id: 'Ace', stars: 2, items: ['Rage', 'Edge'], completed: 2 });
  assert.equal(b.carry, 'Ace');
  assert.equal(b.trait, 'Blade');
  assert.deepEqual(b.filters, ['platinum_plus', 'emerald_plus', 'diamond_plus']);
});

test('clustering separates the two comps and ignores lone boards', () => {
  const records = [...Array.from({ length: 40 }, (_, i) => blades(1 + (i % 4))), ...Array.from({ length: 30 }, (_, i) => guards(5 + (i % 4)))];
  records.push(board(8, [['Dart', 1, []], ['Turf', 1, []]])); // 2 champions: no comp
  const clusters = clusterBoards(
    records.map((r) => toBoard(r, data)),
    data,
    config
  );
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0]!.length, 40);
  assert.ok(clusters[0]!.every((b) => b.champions.has('Ace')));
  assert.equal(clusters[1]!.length, 30);
  assert.ok(clusters[1]!.every((b) => b.champions.has('Wall')));
});

test('comp description: name, carries (three items most often), items, variants, threshold', () => {
  const records = [
    ...Array.from({ length: 24 }, (_, i) => blades(1 + (i % 4))),
    // Ace sometimes with another third item; Dart replaced by Rock in 8 games.
    ...Array.from({ length: 8 }, (_, i) => blades(2 + (i % 3), { ace: ['Rage', 'Edge', 'Vest'] })),
    ...Array.from({ length: 8 }, (_, i) => blades(3 + (i % 2), { swap: 'Rock' })),
  ];
  const members = records.map((r) => toBoard(r, data));
  const comp = describeComp(members, 100, data, config)!;
  assert.equal(comp.trait, 'Blade');
  assert.equal(comp.carry, 'Ace', 'the unit holding the most completed items');
  assert.deepEqual(
    comp.carries.map((c) => c.unit),
    ['Ace', 'Bow'],
    'only Ace and Bow hold three items'
  );
  const ace = comp.carries[0]!;
  assert.deepEqual(ace.items.map((i) => i.item), ['Edge', 'Rage', 'Shield']);
  assert.equal(ace.items[2]!.share, 0.8);
  assert.deepEqual(ace.alternatives.map((i) => i.item), ['Vest']);
  assert.deepEqual(comp.variants, [{ out: 'Dart', in: 'Rock', level: 8, games: 8, avg: 3.5 }]);
  assert.equal(comp.playRate, 0.4);
  assert.equal(describeComp(members, 100, data, { ...config, minCompGames: 41 }), null, 'below the comp threshold');
});

test('item delta: placement with the item minus without it, on the same champion', () => {
  // Ace with Vest: 1st and 3rd; Ace without Vest: 5th and 7th.
  const boards = [blades(1, { ace: ['Vest'] }), blades(3, { ace: ['Vest'] }), blades(5, { ace: ['Rage'] }), blades(7, { ace: ['Rage'] }), blades(2, { ace: ['Vest'] })].map((r) => toBoard(r, data));
  const { champions: stats, items: itemStats } = unitStats(boards, { ...config, minHolderGames: 2, minItemGames: 1 });
  const ace = stats.find((c) => c.id === 'Ace')!;
  const vest = ace.items.find((i) => i.item === 'Vest')!;
  assert.equal(vest.games, 3);
  assert.equal(vest.avg, 2);
  assert.equal(vest.delta, 2 - 6);
  assert.equal(vest.share, 0.6);
  const vestHolders = itemStats.find((i) => i.id === 'Vest')!.holders;
  assert.ok(vestHolders.some((h) => h.champion === 'Ace' && h.delta === -4));
});

test('thresholds: volume correction and tiers', () => {
  const lucky = new Acc().add(1).add(1);
  assert.ok(adjustedAvg(lucky, 100) > 4.4, 'two first places do not make a top tier');
  const solid = new Acc();
  for (let i = 0; i < 1000; i++) solid.add(i % 2 ? 3 : 4);
  assert.ok(Math.abs(adjustedAvg(solid, 100) - 3.59) < 0.01);
  const cuts = { S: 4.15, A: 4.35, B: 4.55 };
  assert.equal(tierOf(4.15, cuts), 'S');
  assert.equal(tierOf(4.2, cuts), 'A');
  assert.equal(tierOf(4.5, cuts), 'B');
  assert.equal(tierOf(4.56, cuts), 'C');
});

test('aggregation: one file per rank filter, same comp ids, comps below the threshold of a filter are hidden', () => {
  const records = [...Array.from({ length: 30 }, (_, i) => blades(1 + (i % 4))), ...Array.from({ length: 25 }, (_, i) => ({ ...guards(5 + (i % 4)), t: 'PLATINUM' as const }))];
  const files = aggregateQueue(records, '16.23', 'ranked', data, config);
  assert.deepEqual(
    files.map((f) => f.filter),
    ['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus']
  );
  const plat = files[0]!;
  assert.equal(plat.boards, 55);
  assert.deepEqual(plat.comps.map((c) => c.id).sort(), ['blade-ace', 'guard-wall']);
  assert.deepEqual(files[2]!.comps.map((c) => c.id), ['blade-ace'], 'Guards boards are Platinum only');
  assert.equal(files[3]!.comps.length, 0);
});

test('synergies: unique champions, forms count once, emblems add a trait only when missing', () => {
  const lookup = synergyLookup({ champions, traits, items });
  const s = computeSynergies(
    [
      { champion: 'Ace' },
      { champion: 'Ace', items: ['GuardEmblem'] }, // copy: Ace still counts once, its emblem adds Guard to Ace
      { champion: 'AceGold' }, // form of Ace: no extra Blade
      { champion: 'Bow', items: ['BladeEmblem'] }, // already Blade: nothing added
      { champion: 'Wall' },
      { champion: 'Edge' },
    ],
    lookup
  );
  const count = (t: string) => s.find((x) => x.trait === t)?.count;
  assert.equal(count('Blade'), 3); // Ace, Bow, Edge
  assert.equal(count('Guard'), 2); // Ace (emblem), Wall
  assert.equal(count('Solo'), 2); // Ace (form), Edge
  assert.equal(s.find((x) => x.trait === 'Guard')!.style, 'bronze');
  assert.equal(s.find((x) => x.trait === 'Blade')!.style, 'bronze');
  assert.equal(s[0]!.style !== null, true, 'active traits first');
});
