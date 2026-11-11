import { SAMPLED_TIERS, type SampledTier } from './config.ts';
import { apexLeague, leagueEntries, summonerById, type LeagueItemDto } from './riot/api.ts';
import type { RiotClient } from './riot/client.ts';
import type { Platform } from './riot/routing.ts';
import { getJson, putJson, type StateStore } from './state/store.ts';

export interface SampledPlayer {
  puuid: string;
  tier: SampledTier;
  /** Unix seconds of the last match-id lookup for this player. */
  lastCrawled?: number;
}

export interface PlayerList {
  platform: Platform;
  refreshedAt: number;
  /** Rotation cursor: next player to crawl. */
  cursor: number;
  players: SampledPlayer[];
}

const DIVISIONS = ['I', 'II', 'III', 'IV'] as const;
const REFRESH_AFTER_MS = 20 * 3600 * 1000;

export const playersKey = (platform: Platform) => `players/${platform}.json`;

/** Lowest sampled tier (EMERALD) is the "worst"; used to label a game by its weakest known player. */
export function lowerTier(a: SampledTier, b: SampledTier): SampledTier {
  return SAMPLED_TIERS.indexOf(a) >= SAMPLED_TIERS.indexOf(b) ? a : b;
}

async function puuidOf(client: RiotClient, platform: Platform, entry: LeagueItemDto): Promise<string | null> {
  if (entry.puuid) return entry.puuid;
  if (!entry.summonerId) return null;
  return (await summonerById(client, platform, entry.summonerId))?.puuid ?? null;
}

/**
 * All Challenger, Grandmaster and Master players, plus `pagesPerDivision` pages of each Diamond and Emerald
 * division. Refreshed once a day; the crawl cursor and last-crawl times survive the refresh.
 */
export async function loadPlayers(
  client: RiotClient,
  store: StateStore,
  platform: Platform,
  pagesPerDivision: number,
  now = Date.now()
): Promise<PlayerList> {
  const previous = await getJson<PlayerList>(store, playersKey(platform));
  if (previous && now - previous.refreshedAt < REFRESH_AFTER_MS) return previous;

  const lastCrawled = new Map((previous?.players ?? []).map((p) => [p.puuid, p.lastCrawled]));
  const players = new Map<string, SampledPlayer>();
  const add = async (entry: LeagueItemDto, tier: SampledTier) => {
    const puuid = await puuidOf(client, platform, entry);
    if (puuid && !players.has(puuid)) players.set(puuid, { puuid, tier, lastCrawled: lastCrawled.get(puuid) });
  };

  for (const tier of ['CHALLENGER', 'GRANDMASTER', 'MASTER'] as const) {
    for (const entry of (await apexLeague(client, platform, tier))?.entries ?? []) await add(entry, tier);
  }
  for (const tier of ['DIAMOND', 'EMERALD'] as const) {
    for (const division of DIVISIONS) {
      for (let page = 1; page <= pagesPerDivision; page++) {
        const entries = (await leagueEntries(client, platform, tier, division, page)) ?? [];
        for (const entry of entries) await add(entry, tier);
        if (entries.length === 0) break;
      }
    }
  }

  const list: PlayerList = {
    platform,
    refreshedAt: now,
    cursor: previous && previous.cursor < players.size ? previous.cursor : 0,
    players: [...players.values()],
  };
  await putJson(store, playersKey(platform), list);
  return list;
}

export function countByTier(list: PlayerList): Record<SampledTier, number> {
  const counts = Object.fromEntries(SAMPLED_TIERS.map((t) => [t, 0])) as Record<SampledTier, number>;
  for (const p of list.players) counts[p.tier]++;
  return counts;
}
