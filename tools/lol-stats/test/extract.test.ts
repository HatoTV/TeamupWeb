import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { extractGame, type GameRecord } from '../src/extract/game.ts';
import { buildItemCatalog } from '../src/extract/items.ts';
import { buildKey, itemPhases, purchaseOrder } from '../src/extract/purchases.ts';
import { maxOrder, skillOrder } from '../src/extract/skills.ts';
import type { MatchDto, TimelineDto, TimelineEventDto } from '../src/riot/api.ts';

const FIXTURES = new URL('../fixtures/', import.meta.url);
const items = JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data;
const catalog = buildItemCatalog(items);

// Item ids (patch 16.22)
const DORAN_RING = 1056;
const POTION = 2003;
const BOOTS = 1001;
const SORCERER = 3020; // tier-2 boots
const LUDENS = 6655;
const RABADON = 3089;
const ZHONYA = 3157;
const SHADOWFLAME = 4645;
const VOID_STAFF = 3135;
const BLASTING_WAND = 1026;
const AMP_TOME = 1052;

const buy = (itemId: number, timestamp: number, participantId = 1): TimelineEventDto => ({ type: 'ITEM_PURCHASED', itemId, timestamp, participantId });
const undo = (beforeId: number, afterId: number, timestamp: number, participantId = 1): TimelineEventDto => ({ type: 'ITEM_UNDO', beforeId, afterId, timestamp, participantId });
const sell = (itemId: number, timestamp: number, participantId = 1): TimelineEventDto => ({ type: 'ITEM_SOLD', itemId, timestamp, participantId });
const destroy = (itemId: number, timestamp: number, participantId = 1): TimelineEventDto => ({ type: 'ITEM_DESTROYED', itemId, timestamp, participantId });
const skill = (skillSlot: number, timestamp: number, levelUpType = 'NORMAL', participantId = 1): TimelineEventDto => ({ type: 'SKILL_LEVEL_UP', skillSlot, timestamp, levelUpType, participantId });

describe('item catalog', () => {
  it('classifies majors, boots and starters', () => {
    for (const id of [LUDENS, RABADON, ZHONYA, SHADOWFLAME, VOID_STAFF]) assert.ok(catalog.isMajor(id), `${id} is major`);
    for (const id of [DORAN_RING, POTION, BOOTS, SORCERER, BLASTING_WAND, AMP_TOME, 3340]) assert.ok(!catalog.isMajor(id), `${id} is not major`);
    assert.equal(catalog.bootsTier(BOOTS), 1);
    assert.equal(catalog.bootsTier(SORCERER), 2);
    assert.equal(catalog.bootsTier(3175), 3); // Spellslinger's Shoes
    assert.equal(catalog.tier2Boots(3175), SORCERER);
    assert.ok(catalog.isStarterOrConsumable(DORAN_RING));
    assert.ok(catalog.isStarterOrConsumable(POTION));
  });
});

describe('purchase order', () => {
  it('handles undo, sale, sale undo and recipe components', () => {
    const events = [
      buy(DORAN_RING, 10_000),
      buy(POTION, 10_000),
      buy(POTION, 10_500),
      undo(POTION, 0, 11_000), // undo the second potion
      buy(AMP_TOME, 200_000),
      buy(BOOTS, 201_000),
      buy(BLASTING_WAND, 400_000),
      destroy(AMP_TOME, 600_000), // component used by the recipe
      destroy(BLASTING_WAND, 600_000),
      buy(LUDENS, 600_000),
      buy(SORCERER, 700_000),
      sell(DORAN_RING, 900_000),
      buy(RABADON, 900_100),
      sell(RABADON, 905_000),
      undo(0, RABADON, 906_000), // undo the sale: Rabadon is owned again
      buy(ZHONYA, 1_200_000),
      buy(99, 1_300_000, 2), // another participant
    ];
    const order = purchaseOrder(events, 1);
    assert.deepEqual(
      order.map((p) => p.itemId),
      [DORAN_RING, POTION, AMP_TOME, BOOTS, BLASTING_WAND, LUDENS, SORCERER, RABADON, ZHONYA]
    );
    assert.equal(order[0]!.sold, true, 'Doran sold');
    assert.equal(order.find((p) => p.itemId === RABADON)!.sold, undefined, 'sale undone');

    const phases = itemPhases(order, catalog);
    assert.deepEqual(phases.start, [DORAN_RING, POTION]);
    assert.deepEqual(phases.firstBuy, [AMP_TOME, BOOTS], 'first back only (the wand is a later session)');
    assert.equal(phases.firstBuyT, 200_000);
    assert.deepEqual(phases.majors, [
      [LUDENS, 600_000],
      [RABADON, 900_100],
      [ZHONYA, 1_200_000],
    ]);
    assert.deepEqual(phases.boots, [SORCERER, 700_000]);
    assert.deepEqual(phases.fullBuild, [LUDENS, SORCERER, RABADON, ZHONYA]);
    assert.equal(buildKey(phases.majors), [LUDENS, RABADON, ZHONYA].sort((a, b) => a - b).join('-'));
  });

  it('counts tier-3 boots as their tier-2 boots and needs three majors for a build key', () => {
    const phases = itemPhases(purchaseOrder([buy(3175, 500_000), buy(LUDENS, 600_000)], 1), catalog);
    assert.deepEqual(phases.boots, [SORCERER, 500_000]);
    assert.equal(buildKey(phases.majors), null);
  });

  it('build keys ignore the order of the three items', () => {
    assert.equal(
      buildKey([
        [ZHONYA, 1],
        [LUDENS, 2],
        [RABADON, 3],
      ]),
      buildKey([
        [RABADON, 1],
        [ZHONYA, 2],
        [LUDENS, 3],
      ])
    );
  });
});

describe('skills', () => {
  it('keeps NORMAL level-ups only, up to level 18', () => {
    const events = [skill(1, 1), skill(3, 2), skill(2, 3, 'EVOLVE'), skill(2, 4), ...Array.from({ length: 20 }, (_, i) => skill(1, 10 + i))];
    const order = skillOrder(events, 1);
    assert.equal(order.length, 18);
    assert.ok(order.startsWith('132'));
  });

  it('computes the max order', () => {
    assert.equal(maxOrder('131214111232333344'), '132'); // Q reaches 5 first, then E… W never: last
    assert.equal(maxOrder('123'), '123');
    assert.equal(maxOrder('3333433221222111'), '321');
  });
});

describe('real games (fixtures)', () => {
  const games = readdirSync(FIXTURES)
    .filter((f) => f.startsWith('TEST_'))
    .map((f) => JSON.parse(readFileSync(new URL(f, FIXTURES), 'utf8')) as { match: MatchDto; timeline: TimelineDto });

  it('extracts 10 coherent participants per game', () => {
    assert.equal(games.length, 5);
    for (const { match, timeline } of games) {
      const game = extractGame(match, timeline, { patches: ['16.22'], platform: 'EUW1', tier: 'CHALLENGER', catalog, minDurationS: 900 }) as GameRecord;
      assert.equal(typeof game, 'object', `${match.metadata.matchId} kept`);
      assert.equal(game.participants.length, 10);
      const roles = game.participants.map((p) => p.role).sort();
      assert.deepEqual(roles, ['BOTTOM', 'BOTTOM', 'JUNGLE', 'JUNGLE', 'MIDDLE', 'MIDDLE', 'TOP', 'TOP', 'UTILITY', 'UTILITY']);
      assert.equal(game.participants.filter((p) => p.win).length, 5);
      for (const p of game.participants) {
        assert.ok(p.opponent, 'lane opponent found');
        assert.equal(Object.keys(p.mates).length, 4);
        assert.equal(p.runes.length, 11);
        assert.ok(p.spells[0] <= p.spells[1]);
        assert.ok(p.start.length > 0, 'starting items');
        assert.ok(p.skills.length >= 6, 'skill order');
        // every final major item (item0-5) appears in the reconstructed majors
        const final = [0, 1, 2, 3, 4, 5].map((i) => (match.info.participants.find((x) => x.puuid === p.puuid) as unknown as Record<string, number>)[`item${i}`]!);
        for (const id of final.filter((id) => catalog.isMajor(id))) assert.ok(p.majors.some(([m]) => m === id), `${id} in majors`);
      }
      assert.ok(game.bans.length <= 10);
    }
  });

  it('skips other queues, other patches and short games', () => {
    const { match, timeline } = games[0]!;
    const opts = { patches: ['16.22'], platform: 'EUW1', tier: 'MASTER' as const, catalog, minDurationS: 900 };
    assert.equal(extractGame({ ...match, info: { ...match.info, queueId: 440 } }, timeline, opts), 'queue');
    assert.equal(extractGame(match, timeline, { ...opts, patches: ['16.21', '16.20'] }), 'patch');
    assert.equal(extractGame({ ...match, info: { ...match.info, gameDuration: 600 } }, timeline, opts), 'short');
  });
});
