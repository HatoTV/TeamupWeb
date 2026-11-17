import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { aggregate } from '../src/aggregate/aggregate.ts';
import { splitCounters, type OpponentCount } from '../src/aggregate/counters.ts';
import { extractGame, goldAt15, type GameRecord, type ParticipantRecord, type Role } from '../src/extract/game.ts';
import { buildItemCatalog } from '../src/extract/items.ts';
import type { MatchDto, TimelineDto } from '../src/riot/api.ts';
import { championBuildSchema } from '../src/schema.ts';

const count = (games: number, wins: number, gold: number[] = []): OpponentCount => ({ games, wins, goldSum: gold.reduce((a, b) => a + b, 0), goldGames: gold.length });

describe('counters: split and threshold', () => {
  it('drops the opponents under the threshold (200 games)', () => {
    const c = splitCounters(
      [
        [1, count(199, 150)],
        [2, count(200, 120)],
        [3, count(200, 60)],
      ],
      200
    );
    assert.deepEqual([...c.advantage, ...c.counter].map((e) => e.championId).sort(), [2, 3]);
  });

  it('a 50 % win rate exactly goes to « Advantage », never to both columns', () => {
    const c = splitCounters(
      [
        [1, count(400, 200)],
        [2, count(400, 199)],
      ],
      200
    );
    assert.deepEqual(c.advantage.map((e) => e.championId), [1]);
    assert.deepEqual(c.counter.map((e) => e.championId), [2]);
    assert.equal(c.advantage[0]!.winRate, 0.5);
  });

  it('« Advantage » by win rate descending, « Counter » ascending (worst first), ties by games', () => {
    const c = splitCounters(
      [
        [1, count(1000, 520)],
        [2, count(1000, 580)],
        [3, count(500, 260)],
        [4, count(1000, 450)],
        [5, count(1000, 400)],
        [6, count(1000, 480)],
      ],
      200
    );
    assert.deepEqual(c.advantage.map((e) => e.championId), [2, 1, 3]);
    assert.deepEqual(c.counter.map((e) => e.championId), [5, 4, 6]);
  });

  it('publishes the rounded mean gold lead only when enough games had a timeline', () => {
    const c = splitCounters(
      [
        [1, count(300, 200, Array.from({ length: 200 }, (_, i) => (i % 2 ? 101 : 100)))],
        [2, count(300, 100, Array.from({ length: 199 }, () => -300))],
      ],
      200
    );
    assert.equal(c.advantage[0]!.goldDiff15, 101); // 100.5 rounded
    assert.equal(c.counter[0]!.goldDiff15, undefined);
  });
});

describe('counters: gold lead at 15:00 from a timeline', () => {
  const FIXTURES = new URL('../fixtures/', import.meta.url);
  const catalog = buildItemCatalog(JSON.parse(readFileSync(new URL('item-16.22.json', FIXTURES), 'utf8')).data);
  const file = readdirSync(FIXTURES).find((f) => f.startsWith('TEST_'))!;
  const { match, timeline } = JSON.parse(readFileSync(new URL(file, FIXTURES), 'utf8')) as { match: MatchDto; timeline: TimelineDto };
  const options = { patches: ['16.22'], platform: 'EUW1', tier: 'MASTER' as const, catalog, minDurationS: 900 };

  /** Same timeline with a minute-15 snapshot: participant n has 5000 + 100 × n gold. */
  const withGold: TimelineDto = {
    ...timeline,
    info: {
      frames: timeline.info.frames.map((f, i) =>
        i === 15
          ? {
              ...f,
              timestamp: 900_034,
              participantFrames: Object.fromEntries(Array.from({ length: 10 }, (_, k) => [String(k + 1), { participantId: k + 1, totalGold: 5000 + 100 * (k + 1) }])),
            }
          : f
      ),
    },
  };

  it('reads the snapshot of the minute 15', () => {
    assert.equal(goldAt15(withGold)?.get(3), 5300);
    assert.equal(goldAt15(timeline), null, 'no participant frames: unknown');
  });

  it('is positive when the champion has more gold than his lane opponent, negative for the opponent', () => {
    const game = extractGame(match, withGold, options) as GameRecord;
    const ps = match.info.participants;
    for (const role of ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const) {
      const [a, b] = ps.filter((p) => p.teamPosition === role);
      const ra = game.participants[ps.indexOf(a!)]!;
      const rb = game.participants[ps.indexOf(b!)]!;
      assert.equal(ra.goldDiff15, 100 * (a!.participantId - b!.participantId), role);
      assert.equal(rb.goldDiff15, -ra.goldDiff15!, role);
    }
    // Participant 10 (most gold) is ahead of his lane opponent.
    assert.ok(game.participants[ps.findIndex((p) => p.participantId === 10)]!.goldDiff15! > 0);
    const noGold = extractGame(match, timeline, options) as GameRecord;
    assert.ok(noGold.participants.every((p) => p.goldDiff15 === undefined));
  });
});

describe('counters: aggregate', () => {
  const ROLES: Role[] = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'];
  const record = (champion: number, role: Role, win: boolean, opponent: number, goldDiff15: number): ParticipantRecord => ({
    champion,
    role,
    win,
    puuid: '',
    riotId: '',
    opponent,
    mates: {},
    runes: [],
    spells: [4, 14],
    start: [],
    firstBuy: [],
    firstBuyT: null,
    majors: [],
    boots: null,
    fullBuild: [],
    skills: '',
    goldDiff15,
  });
  /** Blue side: champions 1-5, red side: `redTop`, 12-15 (same role order). */
  const game = (i: number, blueWins: boolean, redTop = 11): GameRecord => {
    const blue = [1, 2, 3, 4, 5];
    const red = [redTop, 12, 13, 14, 15];
    return {
      id: `G_${i}`,
      platform: 'EUW1',
      patch: '16.22',
      tier: 'MASTER',
      durationS: 1800,
      bans: [],
      participants: [
        ...ROLES.map((role, r) => record(blue[r]!, role, blueWins, red[r]!, 250)),
        ...ROLES.map((role, r) => record(red[r]!, role, !blueWins, blue[r]!, -250)),
      ],
    };
  };

  it('only same-role lane opponents, none in both columns, threshold from the config', async () => {
    // Champion 1 (top): 120 games against 11 (60 % wins), 100 against 21 (40 %), 20 against 31 (under the threshold).
    const games = [
      ...Array.from({ length: 120 }, (_, i) => game(i, i < 72)),
      ...Array.from({ length: 100 }, (_, i) => game(1000 + i, i < 40, 21)),
      ...Array.from({ length: 20 }, (_, i) => game(2000 + i, true, 31)),
    ];
    const out = await aggregate({
      patch: '16.22',
      platforms: ['EUW1'],
      games: () => games,
      previous: new Map(),
      names: { champions: { fr: new Map(), en: new Map() }, items: { fr: new Map(), en: new Map() } },
      exclusive: new Map(),
      config: {
        minBuildGames: 50,
        minBuildShare: 0.03,
        offMetaMinShare: 0.005,
        offMetaMaxShare: 0.03,
        offMetaMinGames: 30,
        altMinShare: 0.08,
        altMinGames: 3,
        lateShare: 0.7,
        minMatchupGames: 1,
        lowSampleGames: 200,
        minCounterGames: 50,
      },
    });
    const top = out.files.find((f) => f.filter === 'master_plus' && f.champion === 1)!;
    championBuildSchema.parse(top);
    assert.deepEqual(top.counters.advantage.map((e) => [e.championId, e.games, e.wins, e.winRate, e.goldDiff15]), [[11, 120, 72, 0.6, 250]]);
    assert.deepEqual(top.counters.counter.map((e) => [e.championId, e.games, e.wins, e.winRate]), [[21, 100, 40, 0.4]]);
    const ids = [...top.counters.advantage, ...top.counters.counter].map((e) => e.championId);
    assert.ok(!ids.some((id) => [2, 3, 4, 5, 12, 13, 14, 15].includes(id)), 'other roles are never lane opponents');
    assert.equal(new Set(ids).size, ids.length);
    const enemy = out.files.find((f) => f.filter === 'master_plus' && f.champion === 11)!;
    assert.deepEqual(enemy.counters.counter.map((e) => [e.championId, e.winRate, e.goldDiff15]), [[1, 0.4, -250]], 'seen from the page champion');
  });
});
