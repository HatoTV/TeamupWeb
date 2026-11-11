import type { Config, SampledTier } from './config.ts';
import { DataDragon } from './ddragon.ts';
import { extractGame, type GameRecord, type SkipReason } from './extract/game.ts';
import { buildItemCatalog, type ItemCatalog } from './extract/items.ts';
import { currentPatch } from './patch.ts';
import { countByTier, loadPlayers, lowerTier, playersKey, type PlayerList } from './players.ts';
import { match as fetchMatch, matchIds, timeline as fetchTimeline } from './riot/api.ts';
import type { RiotClient } from './riot/client.ts';
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
  patch: string;
  platform: Platform;
  players: Record<SampledTier, number>;
  playersCrawled: number;
  newGames: number;
  skipped: Partial<Record<SkipReason | 'missing', number>>;
  requests: number;
  rateLimited: number;
  minutes: number;
}

export const patchMetaKey = (patch: string) => `${patch}/meta.json`;
export const seenKey = (patch: string, platform: Platform) => `${patch}/seen-${platform}.txt.gz`;
export const gamesPrefix = (patch: string) => `${patch}/games/`;

/** Current patch from Data Dragon; a new patch opens a new state without touching the previous one. */
export async function resolvePatch(store: StateStore, ddragon: DataDragon, now = Date.now()): Promise<PatchMeta> {
  const { patch, version } = currentPatch(await ddragon.versions());
  const existing = await getJson<PatchMeta>(store, patchMetaKey(patch));
  if (existing) return existing;
  // Games of the new patch can only be a few days old when we first see it.
  const meta: PatchMeta = { patch, version, startTime: Math.floor(now / 1000) - 3 * 86400, firstSeenAt: now };
  await putJson(store, patchMetaKey(patch), meta);
  return meta;
}

/** Runs `worker` over `items` with at most `concurrency` in flight; stops early when `shouldStop()`. */
async function pool<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>, shouldStop: () => boolean): Promise<void> {
  let next = 0;
  const run = async () => {
    while (next < items.length && !shouldStop()) await worker(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

export interface CrawlDeps {
  client: RiotClient;
  store: StateStore;
  ddragon?: DataDragon;
  catalog?: ItemCatalog;
  now?: () => number;
}

/** Crawls one platform until the time budget or the game cap is reached, then saves the new games. */
export async function crawlPlatform(platform: Platform, meta: PatchMeta, config: Config, deps: CrawlDeps, deadline: number): Promise<CrawlReport> {
  const now = deps.now ?? Date.now;
  const started = now();
  const { client, store } = deps;
  const ddragon = deps.ddragon ?? new DataDragon();
  const catalog = deps.catalog ?? buildItemCatalog((await ddragon.items(meta.version)).data);
  const requestsBefore = client.stats.requests;
  const rateLimitedBefore = client.stats.rateLimited;

  const list: PlayerList = await loadPlayers(client, store, platform, config.pagesPerDivision, now());
  const tierOf = new Map(list.players.map((p) => [p.puuid, p.tier]));
  const seen = decodeIds(await store.get(seenKey(meta.patch, platform)));
  const games: GameRecord[] = [];
  const skipped: CrawlReport['skipped'] = {};
  const inFlight = new Set<string>();
  let playersCrawled = 0;
  let saved = 0;
  let part = 0;
  const stamp = new Date(started).toISOString().replace(/[:.]/g, '-');
  /** Saves the new games, the seen ids and the rotation (every 100 games and at the end). */
  const flush = async () => {
    if (games.length > saved) {
      await store.put(`${gamesPrefix(meta.patch)}${platform}-${stamp}-${++part}.jsonl.gz`, encodeJsonl(games.slice(saved)));
      saved = games.length;
    }
    await store.put(seenKey(meta.patch, platform), encodeIds(seen));
    await putJson(store, playersKey(platform), list);
  };

  const stop = () => now() >= deadline || (config.maxGames > 0 && games.length >= config.maxGames);

  const fetchGame = async (id: string, fallbackTier: SampledTier) => {
    if (seen.has(id) || inFlight.has(id) || stop()) return;
    inFlight.add(id);
    try {
      const m = await fetchMatch(client, platform, id);
      if (!m) {
        skipped.missing = (skipped.missing ?? 0) + 1;
        seen.add(id);
        return;
      }
      // Cheap checks before downloading the (large) timeline.
      const quick = extractGame(m, { metadata: m.metadata, info: { frames: [] } }, { patch: meta.patch, platform, tier: fallbackTier, catalog, minDurationS: config.minGameSeconds });
      if (typeof quick === 'string') {
        skipped[quick] = (skipped[quick] ?? 0) + 1;
        seen.add(id);
        return;
      }
      const t = await fetchTimeline(client, platform, id);
      if (!t) {
        skipped.missing = (skipped.missing ?? 0) + 1;
        return; // retry on a later run
      }
      // Game tier = lowest tier among the sampled players of the game.
      let tier = fallbackTier;
      for (const p of m.info.participants) {
        const known = tierOf.get(p.puuid);
        if (known) tier = lowerTier(tier, known);
      }
      const game = extractGame(m, t, { patch: meta.patch, platform, tier, catalog, minDurationS: config.minGameSeconds });
      if (typeof game === 'string') skipped[game] = (skipped[game] ?? 0) + 1;
      else games.push(game);
      seen.add(id);
    } finally {
      inFlight.delete(id);
    }
  };

  // Round-robin over players, starting at the saved cursor.
  const order = [...list.players.slice(list.cursor), ...list.players.slice(0, list.cursor)];
  for (const player of order) {
    if (stop()) break;
    const since = Math.max(meta.startTime, player.lastCrawled ?? 0);
    const ids = (await matchIds(client, platform, player.puuid, since)) ?? [];
    player.lastCrawled = Math.floor(now() / 1000);
    playersCrawled++;
    list.cursor = (list.cursor + 1) % Math.max(1, list.players.length);
    await pool(ids, 4, (id) => fetchGame(id, player.tier), stop);
    if (games.length - saved >= 100) await flush();
  }

  await flush();

  return {
    patch: meta.patch,
    platform,
    players: countByTier(list),
    playersCrawled,
    newGames: games.length,
    skipped,
    requests: client.stats.requests - requestsBefore,
    rateLimited: client.stats.rateLimited - rateLimitedBefore,
    minutes: Math.round(((now() - started) / 60000) * 10) / 10,
  };
}

/** Crawls every configured platform in parallel (rate limits are per region). */
export async function crawl(config: Config, deps: CrawlDeps): Promise<CrawlReport[]> {
  const ddragon = deps.ddragon ?? new DataDragon();
  const meta = await resolvePatch(deps.store, ddragon);
  const catalog = deps.catalog ?? buildItemCatalog((await ddragon.items(meta.version)).data);
  const deadline = (deps.now ?? Date.now)() + config.budgetMinutes * 60_000;
  return Promise.all(config.platforms.map((platform) => crawlPlatform(platform, meta, config, { ...deps, ddragon, catalog }, deadline)));
}
