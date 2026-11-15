import type { RiotClient } from './client.ts';
import { regionOf, type Platform } from './routing.ts';

export const RANKED_SOLO = 'RANKED_SOLO_5x5';
export const RANKED_SOLO_QUEUE_ID = 420;

// ---------- DTOs (only the fields we use) ----------

export interface LeagueItemDto {
  puuid?: string;
  summonerId?: string;
  leaguePoints: number;
  rank?: string;
  wins: number;
  losses: number;
}

export interface LeagueListDto {
  tier: string;
  entries: LeagueItemDto[];
}

export interface LeagueEntryDto extends LeagueItemDto {
  tier: string;
  queueType: string;
}

export interface SummonerDto {
  puuid: string;
}

export interface PerkStyleDto {
  description: 'primaryStyle' | 'subStyle' | string;
  style: number;
  selections: { perk: number }[];
}

export interface ParticipantDto {
  puuid: string;
  participantId: number;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: '' | 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY';
  win: boolean;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summoner1Id: number;
  summoner2Id: number;
  perks: { statPerks: { offense: number; flex: number; defense: number }; styles: PerkStyleDto[] };
  gameEndedInEarlySurrender?: boolean;
}

export interface MatchDto {
  metadata: { matchId: string };
  info: {
    gameVersion: string;
    gameDuration: number;
    gameCreation: number;
    queueId: number;
    participants: ParticipantDto[];
    teams: { teamId: number; win: boolean; bans: { championId: number; pickTurn: number }[] }[];
  };
}

export type TimelineEventDto =
  | { type: 'ITEM_PURCHASED' | 'ITEM_SOLD' | 'ITEM_DESTROYED'; timestamp: number; participantId: number; itemId: number }
  | { type: 'ITEM_UNDO'; timestamp: number; participantId: number; beforeId: number; afterId: number; goldGain?: number }
  | { type: 'SKILL_LEVEL_UP'; timestamp: number; participantId: number; skillSlot: number; levelUpType: string }
  | { type: string; timestamp: number; participantId?: number };

export interface TimelineDto {
  metadata: { matchId: string };
  info: { frames: { timestamp: number; events: TimelineEventDto[] }[] };
}

// ---------- Endpoints ----------

export function apexLeague(client: RiotClient, platform: Platform, tier: 'CHALLENGER' | 'GRANDMASTER' | 'MASTER') {
  const path = { CHALLENGER: 'challengerleagues', GRANDMASTER: 'grandmasterleagues', MASTER: 'masterleagues' }[tier];
  return client.get<LeagueListDto>(platform, `league-v4.${path}`, `/lol/league/v4/${path}/by-queue/${RANKED_SOLO}`);
}

export function leagueEntries(client: RiotClient, platform: Platform, tier: 'DIAMOND' | 'EMERALD', division: 'I' | 'II' | 'III' | 'IV', page: number) {
  return client.get<LeagueEntryDto[]>(platform, 'league-v4.entries', `/lol/league/v4/entries/${RANKED_SOLO}/${tier}/${division}`, { page });
}

export function summonerById(client: RiotClient, platform: Platform, summonerId: string) {
  return client.get<SummonerDto>(platform, 'summoner-v4.by-id', `/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`);
}

export function matchIds(client: RiotClient, platform: Platform, puuid: string, startTime: number, count = 100) {
  return client.get<string[]>(regionOf(platform), 'match-v5.by-puuid', `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, {
    queue: RANKED_SOLO_QUEUE_ID,
    startTime,
    count,
  });
}

export function match(client: RiotClient, platform: Platform, matchId: string) {
  return client.get<MatchDto>(regionOf(platform), 'match-v5.matches', `/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
}

export function timeline(client: RiotClient, platform: Platform, matchId: string) {
  return client.get<TimelineDto>(regionOf(platform), 'match-v5.timeline', `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`);
}

/** Platform of a match id (`EUW1_7212345678` → `EUW1`). */
export function platformOfMatch(matchId: string): string {
  return matchId.split('_')[0] ?? '';
}

/** league-exp-v4: paginated entries, also for Master, Grandmaster and Challenger (205 per page). */
export function leagueExpEntries(client: RiotClient, platform: Platform, tier: 'CHALLENGER' | 'GRANDMASTER' | 'MASTER', page: number) {
  return client.get<LeagueEntryDto[]>(platform, 'league-exp-v4.entries', `/lol/league-exp/v4/entries/${RANKED_SOLO}/${tier}/I`, { page });
}
