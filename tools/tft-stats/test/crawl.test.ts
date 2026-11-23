import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { RiotClient } from '../../lol-stats/src/riot/client.ts';
import { FileStateStore, decodeIds, decodeJsonl } from '../../lol-stats/src/state/store.ts';
import { fakeClock, jsonResponse } from '../../lol-stats/test/helpers.ts';
import { loadConfig } from '../src/config.ts';
import { crawlPlatform, gamesPrefix, seenKey } from '../src/crawl.ts';
import type { BoardRecord, TftMatchDto } from '../src/extract.ts';

const matchDto = (id: string, queue = 1100, version = 'Version 16.23.1.1'): TftMatchDto => ({
  metadata: { match_id: id, participants: [] },
  info: {
    game_datetime: 0,
    game_version: version,
    queue_id: queue,
    tft_set_number: 18,
    participants: Array.from({ length: 8 }, (_, i) => ({
      puuid: i === 0 ? 'p1' : i === 1 ? 'p2' : `x${i}`,
      placement: i + 1,
      level: 8,
      traits: [],
      units: [{ character_id: 'DA_18_Ashe', tier: 2, itemNames: [] }],
    })),
  },
});

test('crawl: league lists, deduplicated matches, other queues and patches skipped, resumable state', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tft-crawl-'));
  try {
    const clock = fakeClock(Date.parse('2026-11-23T00:00:00Z'));
    const calls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = new URL(String(input));
      calls.push(url.pathname);
      const p = url.pathname;
      if (p.endsWith('/challenger')) return jsonResponse({ tier: 'CHALLENGER', entries: url.searchParams.get('queue') === 'RANKED_TFT' ? [{ puuid: 'p1', leaguePoints: 1000 }] : [] });
      if (p.endsWith('/grandmaster') || p.endsWith('/master')) return jsonResponse({ tier: 'X', entries: [] });
      if (p.includes('/entries/DIAMOND/I') && url.searchParams.get('page') === '1' && url.searchParams.get('queue') === 'RANKED_TFT') return jsonResponse([{ puuid: 'p2', leaguePoints: 50 }]);
      if (p.includes('/entries/')) return jsonResponse([]);
      if (p.includes('/by-puuid/p1/ids')) return jsonResponse(['EUW1_1', 'EUW1_2', 'EUW1_3']);
      if (p.includes('/by-puuid/p2/ids')) return jsonResponse(['EUW1_1', 'EUW1_4']);
      if (p.endsWith('/EUW1_1')) return jsonResponse(matchDto('EUW1_1'));
      if (p.endsWith('/EUW1_2')) return jsonResponse(matchDto('EUW1_2', 1090)); // normal game
      if (p.endsWith('/EUW1_3')) return jsonResponse(matchDto('EUW1_3', 1100, 'Version 16.20.1.1')); // old patch
      if (p.endsWith('/EUW1_4')) return jsonResponse(matchDto('EUW1_4', 1160));
      return jsonResponse({}, 404);
    };
    const client = new RiotClient({ apiKey: 'test', clock, fetch: fetchImpl as typeof fetch });
    const store = new FileStateStore(dir);
    const config = loadConfig({ set: 18, queues: ['ranked', 'double_up'], playerConcurrency: 1, pagesPerDivision: { DIAMOND: 1, EMERALD: 1, PLATINUM: 1 } });
    const patches = { current: '16.23', previous: '16.22', firstSeen: { '16.23': clock.now() - 86_400_000, '16.22': clock.now() - 15 * 86_400_000 } };
    const deps = { client, store, now: clock.now };

    const report = await crawlPlatform('EUW1', patches, config, deps, clock.now() + 3_600_000);
    assert.equal(report.players, 2);
    assert.equal(report.playersCrawled, 2);
    assert.equal(report.newGames, 2, 'EUW1_1 once, EUW1_4 (Double Up)');
    assert.equal(report.skipped.queue, 1);
    assert.equal(report.skipped.patch, 1);
    assert.equal(calls.filter((c) => c.endsWith('/EUW1_1')).length, 1, 'a match shared by two players is fetched once');

    const seen = decodeIds(await store.get(seenKey('16.23', 'EUW1')));
    assert.deepEqual([...seen].sort(), ['EUW1_1', 'EUW1_2', 'EUW1_3', 'EUW1_4'], 'skipped matches are recorded too');
    const records: BoardRecord[] = [];
    for (const key of await store.list(gamesPrefix('16.23'))) records.push(...decodeJsonl<BoardRecord>((await store.get(key))!));
    assert.equal(records.length, 16, '8 boards per match');
    assert.equal(records.find((r) => r.m === 'EUW1_1' && r.pl === 1)!.t, 'CHALLENGER');
    assert.equal(records.find((r) => r.m === 'EUW1_1' && r.pl === 2)!.t, 'DIAMOND');
    assert.equal(records.find((r) => r.m === 'EUW1_1' && r.pl === 8)!.t, 'DIAMOND', 'unknown player: lowest known tier');
    assert.equal(records.find((r) => r.m === 'EUW1_4')!.q, 'double_up');

    // Second run: the league list comes from the state, known matches are not fetched again.
    calls.length = 0;
    const again = await crawlPlatform('EUW1', patches, config, deps, clock.now() + 3_600_000);
    assert.equal(again.newGames, 0);
    assert.ok(!calls.some((c) => c.includes('/league/')), 'players cached for the day');
    assert.ok(!calls.some((c) => /EUW1_\d$/.test(c)), 'no match fetched again');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
