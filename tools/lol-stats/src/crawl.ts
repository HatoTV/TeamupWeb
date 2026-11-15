import type { Config, SampledTier } from './config.ts';
import { DataDragon } from './ddragon.ts';
import { extractGame, type GameRecord, type SkipReason } from './extract/game.ts';
import { buildItemCatalog, type ItemCatalog } from './extract/items.ts';
import { currentPatch, patchOf, previousPatch } from './patch.ts';
import { countByTier, loadPlayers, loadRotation, lowerTier, rotationKey } from './players.ts';
import { match as fetchMatch, matchIds, timeline as fetchTimeline } from './riot/api.ts';
import { RiotApiError, type RiotClient } from './riot/client.ts';
import type { Platform } from './riot/routing.ts';
import { decodeIds, encodeIds, encodeJsonl, getJson, putJson, type StateStore } from './state/store.ts';

export interface PatchMeta {
  patch: string;
  version: string;
  /** Unix seconds: match ids are requested from this time on. */
  startTime: number;
  firstSeenAt: number;
}

export interface CrawlReport {
  /** Current patch. */
  patch: string;
  platform: Platform;
  players: Record<SampledTier, number>;
  playersCrawled: number;
  newGames: number;
  /** New games per patch (current and previous). */
  newGamesByPatch: Record<string, number>;
  skipped: Partial<Record<SkipReason | 'missing' | 'error' | 'newer', number>>;
  requests: number;
  rateLimited: number;
  minutes: number;
  /** Rotation state at the end of the run. */
  passes: number;
  cursor: number;
}

export const patchMetaKey = (patch: string) => `${patch}/meta.json`;
export const seenKey = (patch: string, platform: Platform) => `${patch}/seen-${platform}.txt.gz`;
export const gamesPrefix = (patch: string) => `${patch}/games/`;

/** `16.9` < `16.22`. */
export const comparePatches = (a: string, b: string) => {
  const [am, an] = a.split('.').map(Number);
  const [bm, bn] = b.split('.').map(Number);
  return am! - bm! || an! - bn!;
};

/** Meta of a patch, created on first sight; a new patch opens a new state without touching the others. */
async function patchMeta(store: StateStore, patch: string, version: string, now: number): Promise<PatchMeta> {
  const existing = await getJson<PatchMeta>(store, patchMetaKey(patch));
  if (existing) return existing;
  const meta: PatchMeta = { patch, version, startTime: Math.floor(now / 1000) - 3 * 86400, firstSeenAt: now };
  await putJson(store, patchMetaKey(patch), meta);
  return meta;
}

/** Current patch (Data Dragon) and the previous one: both are collected and published. */
export async function resolvePatches(store: StateStore, ddragon: DataDragon, now = Date.now()): Promise<{ current: PatchMeta; previous: PatchMeta | null }> {
  const versions = await ddragon.versions();
  const { patch, version } = currentPatch(versions);
  const current = await patchMeta(store, patch, version, now);
  const prev = previousPatch(versions, patch);
  const prevVersion = prev ? versions.find((v) => /^\d+\.\d+\./.test(v) && patchOf(v) === prev) : undefined;
  // The previous patch is older than the current one: never newer in `firstSeenAt`.
  const previous = prev && prevVersion ? await patchMeta(store, prev, prevVersion, Math.min(now, current.firstSeenAt - 1)) : null;
  return { current, previous };
}

/** Current patch only. */
export async function resolvePatch(store: StateStore, ddragon: DataDragon, now = Date.now()): Promise<PatchMeta> {
  return (await resolvePatches(store, ddragon, now)).current;
}

export interface CrawlDeps {
  client: RiotClient;
  /** One client per platform (own limiter and request counts); `client` otherwise. */
  clientFor?: (platform: Platform) => RiotClient;
  store: StateStore;
  ddragon?: DataDragon;
  catalog?: ItemCatalog;
  now?: () => number;
}

const MAX_ID_PAGES = 10;

/**
 * Crawls one platform until the time budget is reached or every player has been looked up once in this run.
 * Players are looked up in rotation; each lookup asks for the games since the start of the previous pass
 * (first pass: current and previous patch). Games of both patches are kept, each under its own patch.
 */
export async function crawlPlatform(
  platform: Platform,
  patches: { current: PatchMeta; previous: PatchMeta | null },
  config: Config,
  deps: CrawlDeps,
  deadline: number
): Promise<CrawlReport> {
  const now = deps.now ?? Date.now;
  const started = now();
  const { client, store } = deps;
  const { current, previous } = patches;
  const kept = [current.patch, ...(previous ? [previous.patch] : [])];
  const ddragon = deps.ddragon ?? new DataDragon();
  const catalog = deps.catalog ?? buildItemCatalog((await ddragon.items(current.version)).data);
  const requestsBefore = client.stats.requests;
  const rateLimitedBefore = client.stats.rateLimited;

  const list = await loadPlayers(client, store, platform, config.pagesPerDivision, now());
  const rotation = await loadRotation(store, platform, now());
  if (rotation.cursor >= list.players.length) rotation.cursor = 0;
  const tierOf = new Map(list.players.map((p) => [p.puuid, p.tier]));
  const seen = new Map<string, Set<string>>();
  for (const patch of kept) seen.set(patch, decodeIds(await store.get(seenKey(patch, platform))));
  const isSeen = (id: string) => kept.some((patch) => seen.get(patch)!.has(id));
  const markSeen = (id: string, patch = current.patch) => seen.get(patch)!.add(id);

  /** New games not saved yet, per patch (saved games are dropped from memory). */
  let pending = new Map<string, GameRecord[]>();
  const newGamesByPatch: Record<string, number> = Object.fromEntries(kept.map((p) => [p, 0]));
  let newGames = 0;
  let pendingCount = 0;
  const skipped: CrawlReport['skipped'] = {};
  const inFlight = new Set<string>();
  let playersCrawled = 0;
  let part = 0;
  let lastFlush = now();
  const stamp = new Date(started).toISOString().replace(/[:.]/g, '-');
  let flushing: Promise<void> = Promise.resolve();
  /** Saves the new games, the seen ids and the rotation (serialised: players are crawled concurrently). */
  const flush = () =>
    (flushing = flushing.then(async () => {
      lastFlush = now();
      const batches = pending;
      pending = new Map();
      pendingCount = 0;
      part++;
      for (const [patch, batch] of batches) {
        if (batch.length) await store.put(`${gamesPrefix(patch)}${platform}-${stamp}-${part}.jsonl.gz`, encodeJsonl(batch));
      }
      for (const patch of kept) await store.put(seenKey(patch, platform), encodeIds(seen.get(patch)!));
      await putJson(store, rotationKey(platform), rotation);
      const minutes = Math.round((now() - started) / 60000);
      console.log(
        `[crawl] ${platform} ${minutes} min: ${newGames} new games ${JSON.stringify(newGamesByPatch)}, ${playersCrawled} players ` +
          `(pass ${rotation.passes + 1}, ${rotation.cursor}/${list.players.length}), ${client.stats.requests - requestsBefore} requests, ` +
          `${client.stats.rateLimited - rateLimitedBefore} × 429`
      );
    }));

  const stop = () => now() >= deadline || (config.maxGames > 0 && newGames >= config.maxGames);

  /** Transient failures (5xx or 429 after the retries, network) skip the item; 401 / 403 stop the crawl. */
  const tolerate = (error: unknown) => {
    if (error instanceof RiotApiError && (error.status === 401 || error.status === 403)) throw error;
    skipped.error = (skipped.error ?? 0) + 1;
    if (skipped.error <= 5) console.warn(`[crawl] ${platform}: ${error instanceof Error ? error.message : String(error)}`);
  };

  const options = { patches: kept, platform, catalog, minDurationS: config.minGameSeconds, tierOf: (puuid: string) => tierOf.get(puuid) };

  const fetchGame = async (id: string, fallbackTier: SampledTier) => {
    if (isSeen(id) || inFlight.has(id) || stop()) return;
    inFlight.add(id);
    try {
      const m = await fetchMatch(client, platform, id);
      if (!m) {
        skipped.missing = (skipped.missing ?? 0) + 1;
        markSeen(id);
        return;
      }
      // Cheap checks before downloading the (large) timeline.
      const quick = extractGame(m, { metadata: m.metadata, info: { frames: [] } }, { ...options, tier: fallbackTier });
      if (quick === 'patch') {
        let gamePatch: string | null = null;
        try {
          gamePatch = patchOf(m.info.gameVersion);
        } catch {
          // unknown version: treated as old
        }
        if (gamePatch && comparePatches(gamePatch, current.patch) > 0) {
          // Live patch ahead of Data Dragon: kept for a later run, once Data Dragon knows it.
          skipped.newer = (skipped.newer ?? 0) + 1;
          return;
        }
        // Older than the previous patch: later lookups of the first pass start after it.
        rotation.olderUntil = Math.max(rotation.olderUntil, Math.floor(m.info.gameCreation / 1000));
      }
      if (typeof quick === 'string') {
        skipped[quick] = (skipped[quick] ?? 0) + 1;
        markSeen(id);
        return;
      }
      const t = await fetchTimeline(client, platform, id);
      if (!t) {
        skipped.missing = (skipped.missing ?? 0) + 1;
        return; // retry on a later run
      }
      // Game tier = lowest tier among the collected players of the game (records also keep each player's tier).
      let tier = fallbackTier;
      for (const p of m.info.participants) {
        const known = tierOf.get(p.puuid);
        if (known) tier = lowerTier(tier, known);
      }
      const game = extractGame(m, t, { ...options, tier });
      if (typeof game === 'string') {
        skipped[game] = (skipped[game] ?? 0) + 1;
        markSeen(id);
      } else {
        let batch = pending.get(game.patch);
        if (!batch) pending.set(game.patch, (batch = []));
        batch.push(game);
        pendingCount++;
        newGames++;
        newGamesByPatch[game.patch] = (newGamesByPatch[game.patch] ?? 0) + 1;
        markSeen(id, game.patch);
      }
    } catch (error) {
      tolerate(error); // not marked as seen: retried on a later run
    } finally {
      inFlight.delete(id);
    }
  };

  const lookUp = async (puuid: string, tier: SampledTier, since: number) => {
    const ids: string[] = [];
    try {
      for (let page = 0; page < MAX_ID_PAGES; page++) {
        const batch = (await matchIds(client, platform, puuid, since, 100, page * 100)) ?? [];
        ids.push(...batch);
        if (batch.length < 100) break;
      }
    } catch (error) {
      tolerate(error);
      if (!ids.length) return;
    }
    playersCrawled++;
    let next = 0;
    const worker = async () => {
      while (next < ids.length && !stop()) await fetchGame(ids[next++]!, tier);
    };
    await Promise.all(Array.from({ length: Math.min(config.matchConcurrency, ids.length) }, worker));
    if (pendingCount >= config.flushGames || now() - lastFlush >= config.flushMinutes * 60_000) await flush();
  };

  // Each player at most once per run; several players at a time (the limiter keeps the pace).
  const size = list.players.length;
  let begun = 0;
  const firstPassFrom = Math.floor(started / 1000) - config.firstPassDays * 86400;
  const playerWorker = async () => {
    while (begun < size && !stop()) {
      begun++;
      if (rotation.cursor >= size) {
        // Pass complete: the next lookups ask for the games since the start of the pass that just ended.
        rotation.prevPassStart = rotation.passStart;
        rotation.passStart = Math.floor(now() / 1000);
        rotation.passes++;
        rotation.cursor = 0;
      }
      const player = list.players[rotation.cursor++]!;
      // Two hours of overlap: games still in progress at the previous lookup are not missed.
      const since = rotation.prevPassStart !== null ? rotation.prevPassStart - 7200 : Math.max(firstPassFrom, rotation.olderUntil);
      await lookUp(player.puuid, player.tier, since);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(config.playerConcurrency, size)) }, playerWorker));

  await flush();
  await flushing;

  return {
    patch: current.patch,
    platform,
    players: countByTier(list),
    playersCrawled,
    newGames,
    newGamesByPatch,
    skipped,
    requests: client.stats.requests - requestsBefore,
    rateLimited: client.stats.rateLimited - rateLimitedBefore,
    minutes: Math.round(((now() - started) / 60000) * 10) / 10,
    passes: rotation.passes,
    cursor: rotation.cursor,
  };
}

/** Crawls every configured platform in parallel (rate limits are per region). */
export async function crawl(config: Config, deps: CrawlDeps): Promise<CrawlReport[]> {
  const ddragon = deps.ddragon ?? new DataDragon();
  const patches = await resolvePatches(deps.store, ddragon, (deps.now ?? Date.now)());
  const catalog = deps.catalog ?? buildItemCatalog((await ddragon.items(patches.current.version)).data);
  const deadline = (deps.now ?? Date.now)() + config.budgetMinutes * 60_000;
  return Promise.all(
    config.platforms.map((platform) => crawlPlatform(platform, patches, config, { ...deps, client: deps.clientFor?.(platform) ?? deps.client, ddragon, catalog }, deadline))
  );
}
