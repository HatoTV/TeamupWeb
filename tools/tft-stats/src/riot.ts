// tft-league-v1, tft-match-v1 and tft-summoner-v1 on the shared Riot client of tools/lol-stats (rate limits read from
// the response headers, Retry-After on 429, one limiter per routing value and per method).
import type { RiotClient } from '../../lol-stats/src/riot/client.ts';
import { regionOf, type Platform } from '../../lol-stats/src/riot/routing.ts';
import { LEAGUE_QUEUES, type Tier } from './config.ts';
import type { TftMatchDto } from './extract.ts';
import type { TftQueue } from '../../../src/app/tft/logic/tft-types.ts';

export interface TftLeagueEntryDto {
  puuid: string;
  tier?: string;
  rank?: string;
  leaguePoints: number;
}

export interface TftLeagueListDto {
  tier: string;
  entries: TftLeagueEntryDto[];
}

export function apexLeague(client: RiotClient, platform: Platform, tier: 'CHALLENGER' | 'GRANDMASTER' | 'MASTER', queue: TftQueue) {
  const path = tier.toLowerCase();
  return client.get<TftLeagueListDto>(platform, `tft-league-v1.${path}`, `/tft/league/v1/${path}`, { queue: LEAGUE_QUEUES[queue] });
}

export function leagueEntries(client: RiotClient, platform: Platform, tier: Exclude<Tier, 'CHALLENGER' | 'GRANDMASTER' | 'MASTER'>, division: 'I' | 'II' | 'III' | 'IV', page: number, queue: TftQueue) {
  return client.get<TftLeagueEntryDto[]>(platform, 'tft-league-v1.entries', `/tft/league/v1/entries/${tier}/${division}`, { queue: LEAGUE_QUEUES[queue], page });
}

export function summonerByPuuid(client: RiotClient, platform: Platform, puuid: string) {
  return client.get<{ puuid: string; summonerLevel: number }>(platform, 'tft-summoner-v1.by-puuid', `/tft/summoner/v1/summoners/by-puuid/${encodeURIComponent(puuid)}`);
}

/** Match ids of a player since `startTime` (Unix seconds), newest first. Not filterable by queue: filtered on the match. */
export function matchIds(client: RiotClient, platform: Platform, puuid: string, startTime: number, count: number) {
  return client.get<string[]>(regionOf(platform), 'tft-match-v1.by-puuid', `/tft/match/v1/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, { startTime, count });
}

export function match(client: RiotClient, platform: Platform, matchId: string) {
  return client.get<TftMatchDto>(regionOf(platform), 'tft-match-v1.matches', `/tft/match/v1/matches/${encodeURIComponent(matchId)}`);
}
