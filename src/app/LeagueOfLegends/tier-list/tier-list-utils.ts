import { BuildFilter, TierRank } from '../../core/data/build-data.service';
import { Role } from '../../core/data/champion-data.service';
import { ROLE_ORDER } from '../builds/build-utils';

/** Rank bands of the tier list (tools/lol-stats `RANK_BANDS`). */
export const RANK_BANDS = ['low', 'mid', 'elite'] as const;
export type RankBand = (typeof RANK_BANDS)[number];
export const DEFAULT_BAND: RankBand = 'mid';
export const DEFAULT_ROLE: Role = 'mid';

/** Rank emblems of each band (`assets/img/ranks/{id}.webp`), lowest first. */
export const BAND_EMBLEMS: Record<RankBand, readonly string[]> = {
  low: ['iron', 'bronze', 'silver', 'gold'],
  mid: ['platinum', 'emerald', 'diamond'],
  elite: ['master', 'grandmaster', 'challenger'],
};

/** Build page rank filter matching a band (builds start at Emerald: the default filter otherwise). */
export const BAND_BUILD_FILTER: Record<RankBand, BuildFilter | null> = { low: null, mid: null, elite: 'master_plus' };

export const TIER_ORDER: readonly TierRank[] = ['S+', 'S', 'A', 'B', 'C', 'D'];

/** Tier colours, green (S+) to red (D). */
export const TIER_COLORS: Record<TierRank, string> = { 'S+': '#14E0B4', S: '#3DDC6A', A: '#A6E23A', B: '#FFD23C', C: '#FF8B3D', D: '#FF4F6D' };

/** Fewer ranked champions than this in a role: "not enough games yet" instead of the tiers. */
export const MIN_RANKED = 5;

/** Unknown or missing value → default band. */
export const parseBand = (value: string | null | undefined): RankBand => ((RANK_BANDS as readonly string[]).includes(value ?? '') ? (value as RankBand) : DEFAULT_BAND);

/** Unknown or missing value → default role. */
export const parseRole = (value: string | null | undefined): Role => ((ROLE_ORDER as readonly string[]).includes(value ?? '') ? (value as Role) : DEFAULT_ROLE);

export type WinTone = 'good' | 'neutral' | 'bad';

/**
 * Badge colour of a win rate, from the value shown (one decimal), so that "52,0 %" is never neutral:
 * ≥ 52 % good, 50 to 52 % neutral, < 50 % bad.
 */
export function winTone(winRate: number): WinTone {
  const shown = Math.round(winRate * 1000) / 10;
  return shown >= 52 ? 'good' : shown >= 50 ? 'neutral' : 'bad';
}

/** `#RRGGBB` + alpha (0-1) → `#RRGGBBAA`. */
export const withAlpha = (hex: string, alpha: number): string =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

/** Champions of each tier (S+ to D, empty tiers kept), sorted by win rate, highest first. */
export function groupByTier<T extends { tier: TierRank; winRate: number; name: string }>(champions: readonly T[]): Array<{ tier: TierRank; champions: T[] }> {
  return TIER_ORDER.map((tier) => ({
    tier,
    champions: champions.filter((c) => c.tier === tier).sort((a, b) => b.winRate - a.winRate || a.name.localeCompare(b.name)),
  }));
}
