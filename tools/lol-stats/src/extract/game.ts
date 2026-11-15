import type { SampledTier } from '../config.ts';
import { isGameInPatch } from '../patch.ts';
import { RANKED_SOLO_QUEUE_ID, type MatchDto, type ParticipantDto, type TimelineDto, type TimelineEventDto } from '../riot/api.ts';
import type { ItemCatalog } from './items.ts';
import { itemPhases, purchaseOrder } from './purchases.ts';
import { skillOrder } from './skills.ts';

export const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Compact record of one participant (the raw match JSON is never stored).
 * Runes: [primaryStyle, keystone, p1, p2, p3, subStyle, s1, s2, offense, flex, defense].
 */
export interface ParticipantRecord {
  champion: number;
  role: Role;
  win: boolean;
  puuid: string;
  riotId: string;
  /** Lane opponent's champion (same role, other team), or null. */
  opponent: number | null;
  /** Teammates' champions by role (self excluded). */
  mates: Partial<Record<Role, number>>;
  runes: number[];
  /** Summoner spells as an unordered pair (smaller id first). */
  spells: [number, number];
  start: number[];
  firstBuy: number[];
  firstBuyT: number | null;
  majors: Array<[number, number]>;
  boots: [number, number] | null;
  fullBuild: number[];
  /** Slots 1–4 for levels 1 to 18, e.g. "131213…". */
  skills: string;
  /** Ranked tier of the player when he is in the collected player list (absent in records before 2026-11-15). */
  tier?: SampledTier;
}

export interface GameRecord {
  id: string;
  platform: string;
  patch: string;
  /** Tier of the sampled player(s) who led us to this game (the lowest one when several are known). */
  tier: SampledTier;
  durationS: number;
  /** Banned champions of the game, counted once per game. */
  bans: number[];
  participants: ParticipantRecord[];
}

export interface ExtractOptions {
  /** Patches kept (current and previous); the record gets the game's own patch. */
  patches: readonly string[];
  platform: string;
  tier: SampledTier;
  catalog: ItemCatalog;
  minDurationS: number;
  /** Tier of a collected player. */
  tierOf?: (puuid: string) => SampledTier | undefined;
}

export type SkipReason = 'queue' | 'patch' | 'short' | 'positions';

function runesOf(p: ParticipantDto): number[] {
  const primary = p.perks.styles.find((s) => s.description === 'primaryStyle');
  const sub = p.perks.styles.find((s) => s.description === 'subStyle');
  const { offense, flex, defense } = p.perks.statPerks;
  return [
    primary?.style ?? 0,
    ...(primary?.selections ?? []).slice(0, 4).map((s) => s.perk),
    sub?.style ?? 0,
    ...(sub?.selections ?? []).slice(0, 2).map((s) => s.perk),
    offense,
    flex,
    defense,
  ];
}

/** Returns the compact game, or the reason it is ignored. */
export function extractGame(match: MatchDto, timeline: TimelineDto, options: ExtractOptions): GameRecord | SkipReason {
  const { info } = match;
  if (info.queueId !== RANKED_SOLO_QUEUE_ID) return 'queue';
  const patch = options.patches.find((p) => isGameInPatch(info.gameVersion, p));
  if (!patch) return 'patch';
  if (info.gameDuration < options.minDurationS || info.participants.some((p) => p.gameEndedInEarlySurrender)) return 'short';
  const positioned = info.participants.filter((p) => (ROLES as readonly string[]).includes(p.teamPosition));
  if (positioned.length !== 10) return 'positions';

  const events: TimelineEventDto[] = timeline.info.frames.flatMap((f) => f.events).sort((a, b) => a.timestamp - b.timestamp);

  const participants = info.participants.map((p): ParticipantRecord => {
    const role = p.teamPosition as Role;
    const opponent = info.participants.find((o) => o.teamId !== p.teamId && o.teamPosition === role);
    const mates: Partial<Record<Role, number>> = {};
    for (const m of info.participants) if (m.teamId === p.teamId && m.participantId !== p.participantId) mates[m.teamPosition as Role] = m.championId;
    const phases = itemPhases(purchaseOrder(events, p.participantId), options.catalog);
    const spells = [p.summoner1Id, p.summoner2Id].sort((a, b) => a - b) as [number, number];
    return {
      champion: p.championId,
      role,
      win: p.win,
      puuid: p.puuid,
      riotId: p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline ?? ''}` : '',
      opponent: opponent?.championId ?? null,
      mates,
      runes: runesOf(p),
      spells,
      start: phases.start,
      firstBuy: phases.firstBuy,
      firstBuyT: phases.firstBuyT,
      majors: phases.majors,
      boots: phases.boots,
      fullBuild: phases.fullBuild,
      skills: skillOrder(events, p.participantId),
      ...(tierOfPlayer(options, p.puuid) ? { tier: tierOfPlayer(options, p.puuid) } : {}),
    };
  });

  const bans = [...new Set(info.teams.flatMap((t) => t.bans.map((b) => b.championId)).filter((id) => id > 0))];

  return {
    id: match.metadata.matchId,
    platform: options.platform,
    patch,
    tier: options.tier,
    durationS: info.gameDuration,
    bans,
    participants,
  };
}

const tierOfPlayer = (options: ExtractOptions, puuid: string) => (puuid ? options.tierOf?.(puuid) : undefined);
