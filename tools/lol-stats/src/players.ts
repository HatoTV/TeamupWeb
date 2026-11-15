import { gunzipSync, gzipSync } from 'node:zlib';
import { SAMPLED_TIERS, type SampledTier } from './config.ts';
import { apexLeague, leagueEntries, summonerById, type LeagueItemDto } from './riot/api.ts';
import type { RiotClient } from './riot/client.ts';
import type { Platform } from './riot/routing.ts';
import { getJson, putJson, type StateStore } from './state/store.ts';

export interface SampledPlayer {
  puuid: string;
  tier: SampledTier;
}

export interface PlayerList {
  platform: Platform;
  refreshedAt: number;
  /** Sorted by puuid, so that the rotation order is stable across refreshes. */
  players: SampledPlayer[];
}

/**
 * Rotation over the player list. Every player is looked up once per pass; a lookup asks for the games since the
 * start of the previous pass, so every game of a player is found even when a pass lasts several days.
 */
export interface Rotation {
  cursor: number;
  /** Unix seconds. */
  passStart: number;
  /** Unix seconds; null during the very first pass (look-back = current and previous patch). */
  prevPassStart: number | null;
  /** First pass only: newest game start (unix seconds) seen from a patch older than the previous one. */
  olderUntil: number;
  passes: number;
}

const DIVISIONS = ['I', 'II', 'III', 'IV'] as const;
const REFRESH_AFTER_MS = 20 * 3600 * 1000;

export const playersKey = (platform: Platform) => `players/${platform}.tsv.gz`;
export const playersMetaKey = (platform: Platform) => `players/${platform}.meta.json`;
export const rotationKey = (platform: Platform) => `rotation/${platform}.json`;

/** Lowest sampled tier (EMERALD) is the "worst"; used to label a game by its weakest known player. */
export function lowerTier(a: SampledTier, b: SampledTier): SampledTier {
  return SAMPLED_TIERS.indexOf(a) >= SAMPLED_TIERS.indexOf(b) ? a : b;
}

export function encodePlayers(players: readonly SampledPlayer[]): Buffer {
  return gzipSync(players.map((p) => `${p.puuid}\t${p.tier}`).join('\n'));
}

export function decodePlayers(body: Buffer | null): SampledPlayer[] {
  if (!body) return [];
  const text = gunzipSync(body).toString('utf8');
  if (!text) return [];
  return text.split('\n').map((line) => {
    const [puuid, tier] = line.split('\t');
    return { puuid: puuid!, tier: tier as SampledTier };
  });
}

async function puuidOf(client: RiotClient, platform: Platform, entry: LeagueItemDto): Promise<string | null> {
  if (entry.puuid) return entry.puuid;
  if (!entry.summonerId) return null;
  return (await summonerById(client, platform, entry.summonerId))?.puuid ?? null;
}

/**
 * Challenger, Grandmaster and Master players, plus Diamond and Emerald (every page when `pagesPerDivision` is 0,
 * otherwise that many pages per division). Refreshed once a day.
 */
export async function loadPlayers(
  client: RiotClient,
  store: StateStore,
  platform: Platform,
  pagesPerDivision: number,
  now = Date.now()
): Promise<PlayerList> {
  const meta = await getJson<{ refreshedAt: number }>(store, playersMetaKey(platform));
  if (meta && now - meta.refreshedAt < REFRESH_AFTER_MS) {
    const players = decodePlayers(await store.get(playersKey(platform)));
    if (players.length) return { platform, refreshedAt: meta.refreshedAt, players };
  }

  const players = new Map<string, SampledPlayer>();
  const add = async (entry: LeagueItemDto, tier: SampledTier) => {
    const puuid = await puuidOf(client, platform, entry);
    if (puuid && !players.has(puuid)) players.set(puuid, { puuid, tier });
  };

  for (const tier of ['CHALLENGER', 'GRANDMASTER', 'MASTER'] as const) {
    for (const entry of (await apexLeague(client, platform, tier))?.entries ?? []) await add(entry, tier);
  }
  for (const tier of ['DIAMOND', 'EMERALD'] as const) {
    for (const division of DIVISIONS) {
      for (let page = 1; pagesPerDivision <= 0 || page <= pagesPerDivision; page++) {
        const entries = (await leagueEntries(client, platform, tier, division, page)) ?? [];
        for (const entry of entries) await add(entry, tier);
        if (entries.length === 0) break;
      }
    }
  }

  const list: PlayerList = { platform, refreshedAt: now, players: [...players.values()].sort((a, b) => (a.puuid < b.puuid ? -1 : 1)) };
  await store.put(playersKey(platform), encodePlayers(list.players));
  await putJson(store, playersMetaKey(platform), { refreshedAt: now, counts: countByTier(list) });
  return list;
}

export async function loadRotation(store: StateStore, platform: Platform, now: number): Promise<Rotation> {
  return (await getJson<Rotation>(store, rotationKey(platform))) ?? { cursor: 0, passStart: Math.floor(now / 1000), prevPassStart: null, olderUntil: 0, passes: 0 };
}

export function countByTier(list: PlayerList): Record<SampledTier, number> {
  const counts = Object.fromEntries(SAMPLED_TIERS.map((t) => [t, 0])) as Record<SampledTier, number>;
  for (const p of list.players) counts[p.tier]++;
  return counts;
}
