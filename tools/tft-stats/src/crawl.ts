import { gunzipSync, gzipSync } from 'node:zlib';
import { RiotApiError, type RiotClient } from '../../lol-stats/src/riot/client.ts';
import type { Platform } from '../../lol-stats/src/riot/routing.ts';
import { decodeIds, encodeIds, encodeJsonl, getJson, putJson, type StateStore } from '../../lol-stats/src/state/store.ts';
import type { TftQueue } from '../../../src/app/tft/logic/tft-types.ts';
import { APEX_TIERS, DIVISION_TIERS, TIERS, type Config, type Tier } from './config.ts';
import { extractMatch, type BoardRecord, type SkipReason } from './extract.ts';
import { apexLeague, leagueEntries, match as fetchMatch, matchIds } from './riot.ts';

// ---------- state keys (private state bucket, prefix `tft-stats/`: never public, it holds player ids) ----------

export const playersKey = (platform: Platform) => `players/${platform}.json.gz`;
export const rotationKey = (platform: Platform) => `rotation/${platform}.json`;
export const seenKey = (patch: string, platform: Platform) => `${patch}/seen-${platform}.txt.gz`;
export const gamesPrefix = (patch: string) => `${patch}/games/`;
export const PATCHES_KEY = 'patches.json';

/** Current and previous patch, with the time each was first seen (start of the collection of its games). */
export interface PatchState {
  current: string;
  previous: string | null;
  firstSeen: Record<string, number>;
}

/** Players of a platform: tier in each queue's ladder. */
export interface PlayerList {
  fetchedAt: number;
  players: Array<{ puuid: string; tiers: Partial<Record<TftQueue, Tier>> }>;
}

export interface Rotation {
  cursor: number;
  /** Start of the current pass and of the previous one (ms): games are asked for since the previous pass. */
  passStart: number;
  previousPassStart: number;
  passes: number;
}

const DIVISIONS = ['I', 'II', 'III', 'IV'] as const;
const PLAYERS_MAX_AGE_MS = 20 * 3_600_000;

/** League lists of the collected tiers for every queue, refreshed once a day. */
export async function loadPlayers(client: RiotClient, store: StateStore, platform: Platform, config: Pick<Config, 'queues' | 'pagesPerDivision'>, now: number): Promise<PlayerList> {
  const body = await store.get(playersKey(platform));
  const cached = body ? (JSON.parse(gunzipSync(body).toString('utf8')) as PlayerList) : null;
  if (cached && now - cached.fetchedAt < PLAYERS_MAX_AGE_MS) return cached;

  const byPuuid = new Map<string, PlayerList['players'][number]>();
  const add = (puuid: string | undefined, queue: TftQueue, tier: Tier) => {
    if (!puuid) return;
    let p = byPuuid.get(puuid);
    if (!p) byPuuid.set(puuid, (p = { puuid, tiers: {} }));
    p.tiers[queue] ??= tier;
  };
  for (const queue of config.queues) {
    for (const tier of APEX_TIERS) {
      const list = await apexLeague(client, platform, tier, queue);
      for (const e of list?.entries ?? []) add(e.puuid, queue, tier);
    }
    for (const tier of DIVISION_TIERS) {
      const maxPages = config.pagesPerDivision[tier] || Infinity;
      for (const division of DIVISIONS) {
        for (let page = 1; page <= maxPages; page++) {
          const entries = await leagueEntries(client, platform, tier, division, page, queue);
          if (!entries?.length) break;
          for (const e of entries) add(e.puuid, queue, tier);
        }
      }
    }
  }
  // Highest tiers first: they are looked up first in each pass.
  const rank = (p: PlayerList['players'][number]) => Math.min(...Object.values(p.tiers).map((t) => TIERS.indexOf(t!)));
  const list: PlayerList = { fetchedAt: now, players: [...byPuuid.values()].sort((a, b) => rank(a) - rank(b) || a.puuid.localeCompare(b.puuid)) };
  await store.put(playersKey(platform), gzipSync(Buffer.from(JSON.stringify(list))));
  return list;
}

export interface CrawlReport {
  platform: Platform;
  players: number;
  playersCrawled: number;
  newGames: number;
  newGamesByPatch: Record<string, number>;
  skipped: Partial<Record<SkipReason | 'patch' | 'missing' | 'error', number>>;
  requests: number;
  rateLimited: number;
  minutes: number;
  passes: number;
}

export interface CrawlDeps {
  client: RiotClient;
  store: StateStore;
  now?: () => number;
}

/**
 * Collects one platform until the deadline or until every player was looked up once in this run. Players are looked up
 * in rotation; each lookup asks for the games played since the start of the previous pass (first pass: since the
 * previous patch was first seen). Matches are deduplicated per patch, only ranked and Double Up games of the set and of
 * the two kept patches are stored, as compact board records (never the raw JSON). State is saved every
 * `flushGames` games or `flushMinutes` minutes, so a run stopped by the time limit resumes where it stopped.
 */
export async function crawlPlatform(platform: Platform, patches: PatchState, config: Config, deps: CrawlDeps, deadline: number): Promise<CrawlReport> {
  const now = deps.now ?? Date.now;
  const started = now();
  const { client, store } = deps;
  const kept = [patches.current, ...(patches.previous ? [patches.previous] : [])];
  const before = { requests: client.stats.requests, rateLimited: client.stats.rateLimited };

  const list = await loadPlayers(client, store, platform, config, now());
  const tiers = new Map(list.players.map((p) => [p.puuid, p.tiers]));
  const tierOf = (puuid: string, queue: TftQueue) => tiers.get(puuid)?.[queue];
  const oldest = Math.min(...kept.map((p) => patches.firstSeen[p] ?? started));
  const rotation: Rotation = (await getJson<Rotation>(store, rotationKey(platform))) ?? { cursor: 0, passStart: started, previousPassStart: oldest, passes: 0 };

  const seen = new Map<string, Set<string>>();
  for (const patch of kept) seen.set(patch, decodeIds(await store.get(seenKey(patch, platform))));
  const isSeen = (id: string) => kept.some((p) => seen.get(p)!.has(id));
  /** Matches being fetched (two players of the same match). Matches outside the kept queues or patches are recorded as
   * seen in the current patch: not stored, never fetched again. */
  const ignored = new Set<string>();
  const markIgnored = (id: string) => seen.get(patches.current)!.add(id);

  let pending = new Map<string, BoardRecord[]>();
  let pendingGames = 0;
  let part = 0;
  let lastFlush = now();
  const stamp = new Date(started).toISOString().replace(/[:.]/g, '-');
  const report: CrawlReport = { platform, players: list.players.length, playersCrawled: 0, newGames: 0, newGamesByPatch: Object.fromEntries(kept.map((p) => [p, 0])), skipped: {}, requests: 0, rateLimited: 0, minutes: 0, passes: rotation.passes };
  const skip = (reason: keyof CrawlReport['skipped']) => (report.skipped[reason] = (report.skipped[reason] ?? 0) + 1);

  let flushing: Promise<void> = Promise.resolve();
  const flush = () => {
    const batch = pending;
    pending = new Map();
    pendingGames = 0;
    lastFlush = now();
    const n = part++;
    flushing = flushing.then(async () => {
      for (const [patch, records] of batch) if (records.length) await store.put(`${gamesPrefix(patch)}${platform}-${stamp}-${n}.jsonl.gz`, encodeJsonl(records));
      for (const patch of kept) await store.put(seenKey(patch, platform), encodeIds(seen.get(patch)!));
      await putJson(store, rotationKey(platform), rotation);
    });
    return flushing;
  };

  const lookup = async (puuid: string) => {
    const since = Math.floor(Math.max(oldest, rotation.previousPassStart) / 1000);
    let ids: string[] | null;
    try {
      ids = await matchIds(client, platform, puuid, since, config.gamesPerPlayer);
    } catch (error) {
      if (error instanceof RiotApiError && (error.status === 401 || error.status === 403) && !error.firewall) throw error;
      skip('error');
      return;
    }
    for (const id of ids ?? []) {
      if (now() >= deadline) return;
      if (isSeen(id) || ignored.has(id)) continue;
      ignored.add(id);
      let dto;
      try {
        dto = await fetchMatch(client, platform, id);
      } catch (error) {
        if (error instanceof RiotApiError && (error.status === 401 || error.status === 403) && !error.firewall) throw error;
        skip('error');
        continue;
      }
      if (!dto) {
        skip('missing');
        continue;
      }
      const boards = extractMatch(dto, config.set, tierOf);
      if (typeof boards === 'string') {
        skip(boards);
        markIgnored(id);
        continue;
      }
      const patch = boards[0]?.p;
      if (!patch || !kept.includes(patch)) {
        skip('patch');
        markIgnored(id);
        continue;
      }
      seen.get(patch)!.add(id);
      let records = pending.get(patch);
      if (!records) pending.set(patch, (records = []));
      records.push(...boards);
      pendingGames++;
      report.newGames++;
      report.newGamesByPatch[patch] = (report.newGamesByPatch[patch] ?? 0) + 1;
      if (pendingGames >= config.flushGames || now() - lastFlush >= config.flushMinutes * 60_000) void flush();
    }
  };

  const total = list.players.length;
  const startCursor = rotation.cursor % Math.max(1, total);
  let taken = 0;
  const worker = async () => {
    while (taken < total && now() < deadline) {
      const index = (startCursor + taken++) % total;
      await lookup(list.players[index]!.puuid);
      report.playersCrawled++;
      rotation.cursor = index + 1;
      if (rotation.cursor >= total) {
        // End of a pass: the next one asks for the games since this pass started.
        rotation.cursor = 0;
        rotation.previousPassStart = rotation.passStart;
        rotation.passStart = now();
        rotation.passes++;
      }
    }
  };
  if (total) await Promise.all(Array.from({ length: Math.min(config.playerConcurrency, total) }, worker));
  await flush();
  await flushing;

  report.requests = client.stats.requests - before.requests;
  report.rateLimited = client.stats.rateLimited - before.rateLimited;
  report.minutes = Math.round((now() - started) / 60_000);
  report.passes = rotation.passes;
  return report;
}
