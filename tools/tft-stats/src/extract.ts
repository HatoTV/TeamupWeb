import type { TftQueue } from '../../../src/app/tft/logic/tft-types.ts';
import { TIERS, queueOfId, type Tier } from './config.ts';

// ---------- tft-match-v1 DTOs (fields used) ----------

export interface TftTraitDto {
  name: string;
  num_units: number;
  style: number;
  tier_current: number;
  tier_total?: number;
}

export interface TftUnitDto {
  character_id: string;
  itemNames?: string[];
  rarity?: number;
  /** Star level. */
  tier: number;
}

export interface TftParticipantDto {
  puuid: string;
  placement: number;
  level: number;
  augments?: string[];
  traits: TftTraitDto[];
  units: TftUnitDto[];
}

export interface TftMatchDto {
  metadata: { match_id: string; participants: string[] };
  info: {
    game_datetime: number;
    game_version: string;
    queue_id: number;
    tft_set_number: number;
    participants: TftParticipantDto[];
  };
}

/**
 * Final board of one player (the raw JSON is never stored). The API gives neither unit positions, nor the level-up
 * history, nor the early game: only the final board.
 */
export interface BoardRecord {
  /** Match id. */
  m: string;
  q: TftQueue;
  /** Patch `major.minor`. */
  p: string;
  /** Tier of the player when he is in a collected league list, otherwise the lowest known tier of the match. */
  t: Tier;
  /** Placement 1 to 8. */
  pl: number;
  /** Final level. */
  lv: number;
  /** Units: character id, stars, item ids (raw ids of the match data). */
  u: Array<[string, number, string[]]>;
  /** Traits reported by the API: id, units, style (0 inactive … 4 prismatic). */
  tr: Array<[string, number, number]>;
  /** Augments. */
  a: string[];
}

export type SkipReason = 'queue' | 'set' | 'version';

/** `Linux Version 16.23.725.2938 (Nov 18 2026/…) [PUBLIC] <Releases/16.23>` → `16.23`. */
export function patchOfGameVersion(version: string): string | null {
  const m = /Version (\d+)\.(\d+)\./.exec(version) ?? /\b(\d+)\.(\d+)\.\d+/.exec(version);
  return m ? `${Number(m[1])}.${Number(m[2])}` : null;
}

const lower = (a: Tier, b: Tier): Tier => (TIERS.indexOf(a) >= TIERS.indexOf(b) ? a : b);

/** Boards of a match, or why it is skipped. `tierOf`: tier of a collected player in the league of the match queue (ranked and Double Up have their own ladders). */
export function extractMatch(match: TftMatchDto, set: number, tierOf: (puuid: string, queue: TftQueue) => Tier | undefined): BoardRecord[] | SkipReason {
  const queue = queueOfId(match.info.queue_id);
  if (!queue) return 'queue';
  if (match.info.tft_set_number !== set) return 'set';
  const patch = patchOfGameVersion(match.info.game_version);
  if (!patch) return 'version';
  const known = match.info.participants.map((p) => tierOf(p.puuid, queue)).filter((t): t is Tier => !!t);
  const matchTier = known.reduce<Tier | null>((acc, t) => (acc ? lower(acc, t) : t), null) ?? 'PLATINUM';
  return match.info.participants.map((p) => ({
    m: match.metadata.match_id,
    q: queue,
    p: patch,
    t: tierOf(p.puuid, queue) ?? matchTier,
    pl: p.placement,
    lv: p.level,
    u: p.units.map((u) => [u.character_id, Math.max(1, Math.min(3, u.tier || 1)), (u.itemNames ?? []).slice(0, 3)] as [string, number, string[]]),
    tr: p.traits.map((t) => [t.name, t.num_units, t.style] as [string, number, number]),
    a: p.augments ?? [],
  }));
}
