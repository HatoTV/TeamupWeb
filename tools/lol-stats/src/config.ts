import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Platform } from './riot/routing.ts';
import { DEFAULT_MAIN_ROLE_SHARE } from './aggregate/roles.ts';

export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
export const REPO_DIR = fileURLToPath(new URL('../../..', import.meta.url));

/**
 * Rank filters shown on the site: `*_plus` include every tier above (lowest first), the others a single tier
 * (`challenger` is both). A player's games count in the filters of his own tier.
 */
export const TIER_FILTERS = ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger', 'emerald', 'diamond', 'master', 'grandmaster'] as const;
export type TierFilter = (typeof TIER_FILTERS)[number];

/** Riot tiers we sample, highest first. */
export const SAMPLED_TIERS = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON'] as const;
export type SampledTier = (typeof SAMPLED_TIERS)[number];

/** Tiers collected completely (every player), the only ones in the build filters. */
export const BUILD_TIERS: readonly SampledTier[] = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD'];

/** Filters a player of a given tier belongs to (none below Emerald: builds are Emerald and above). */
export function filtersForTier(tier: SampledTier): TierFilter[] {
  const rank = SAMPLED_TIERS.indexOf(tier); // 0 = challenger … 4 = emerald
  if (rank > 4) return [];
  const filters: TierFilter[] = ['emerald_plus'];
  if (rank <= 3) filters.push('diamond_plus');
  if (rank <= 2) filters.push('master_plus');
  if (rank <= 1) filters.push('grandmaster_plus');
  if (rank === 0) filters.push('challenger');
  else filters.push(tier.toLowerCase() as TierFilter);
  return filters;
}

/** Rank bands of the tier list. */
export const RANK_BANDS = {
  low: ['IRON', 'BRONZE', 'SILVER', 'GOLD'],
  mid: ['PLATINUM', 'EMERALD', 'DIAMOND'],
  elite: ['MASTER', 'GRANDMASTER', 'CHALLENGER'],
} as const satisfies Record<string, readonly SampledTier[]>;
export type RankBand = keyof typeof RANK_BANDS;
export const RANK_BAND_KEYS = Object.keys(RANK_BANDS) as RankBand[];

export const bandOf = (tier: SampledTier): RankBand => RANK_BAND_KEYS.find((band) => (RANK_BANDS[band] as readonly string[]).includes(tier))!;

/**
 * Tiers that are sampled (a few league pages per division) rather than collected completely, by tier-list band:
 * `low` = Iron to Gold, `mid` = Platinum (Emerald and Diamond are in the complete collection).
 */
export const SAMPLE_POOLS = {
  low: ['GOLD', 'SILVER', 'BRONZE', 'IRON'],
  mid: ['PLATINUM'],
} as const satisfies Record<string, readonly SampledTier[]>;
export type SamplePool = keyof typeof SAMPLE_POOLS;

/** Budget of a sampled band, per platform and per crawl. */
export interface PoolBudget {
  /** League pages listed per tier / division (205 players per page). */
  pages: number;
  /** New games per crawl (0 = band not collected). */
  games: number;
  /** Most recent games looked at per player, so that the sample spreads over many players. */
  gamesPerPlayer: number;
}

/**
 * Platforms the collector knows. Only the enabled ones are crawled by default (`LOL_STATS_PLATFORMS`
 * overrides the list). Each platform has its own Riot limits (500 requests / 10 s, 30 000 / 10 min with the
 * production key), so they are collected in parallel.
 */
export const PLATFORMS: Readonly<Record<'EUW1' | 'KR' | 'NA1', { enabled: boolean }>> = {
  EUW1: { enabled: true },
  KR: { enabled: true },
  NA1: { enabled: true },
};
export const DEFAULT_PLATFORMS = (Object.keys(PLATFORMS) as Platform[]).filter((p) => PLATFORMS[p as keyof typeof PLATFORMS].enabled);

export interface Config {
  apiKey: string;
  platforms: Platform[];
  /** League pages listed per tier / division (205 entries per page); 0 = every page (complete collection). */
  pagesPerDivision: number;
  firstPassDays: number;
  /** Wall-clock budget of one crawl, in minutes. */
  budgetMinutes: number;
  /** Players crawled at the same time, and games fetched at the same time per player. */
  playerConcurrency: number;
  matchConcurrency: number;
  /** The state is saved to R2 every `flushGames` new games or every `flushMinutes`, whichever comes first. */
  flushGames: number;
  flushMinutes: number;
  /** Maximum number of new games fetched by one crawl (0 = unlimited, budget only). */
  maxGames: number;
  /** Games shorter than this are ignored (remakes, early surrenders). */
  minGameSeconds: number;
  /** The three most played builds need max(minBuildGames, minBuildShare × games of the champion in the role). */
  minBuildGames: number;
  minBuildShare: number;
  /** OFF-META build: at least this share of the champion games and offMetaMinGames games, a win rate at least the
   *  champion's minus offMetaWinRateGap. */
  offMetaMinShare: number;
  offMetaMinGames: number;
  offMetaWinRateGap: number;
  /** Alternatives of items 4-6 need this share of the purchases made at their slot, and this many games. */
  altMinShare: number;
  altMinGames: number;
  /** An item bought 6th in more than this share of its 4th-6th purchases is not proposed 4th. */
  lateShare: number;
  /** Lane opponents / duo partners need at least this many games. */
  minMatchupGames: number;
  /** Counters tab: lane opponents need at least this many games. */
  minCounterGames: number;
  /** A new patch is shown once a champion / role reaches this many games. */
  minGamesForNewPatch: number;
  /** A filter below this many games shows the "few games" warning; a tier-list champion below it is not ranked. */
  lowSampleGames: number;
  /** A role is one of a champion's main roles from this share of his games (patch, all ranks); the others are ignored. */
  mainRoleShare: number;
  /** Sampled bands (tiers below Emerald): pages, games per crawl and per player. */
  pools: Record<SamplePool, PoolBudget>;
  /** Tier list: score = 100 × Wilson lower bound + pickWeight × min(pick rate in %, pickCap). */
  tierPickWeight: number;
  tierPickCap: number;
  /** Tier list: percentile cuts of S+, S, A, B and C (the rest is D). */
  tierCuts: number[];
  /** Published data is a small sample (development key): the site shows a "sample data" notice. */
  sample: boolean;
  stateDir: string;
  outputDir: string;
  /** Tier list files: `{tierListDir}/{patch}/{band}.json`. */
  tierListDir: string;
}

const num = (value: string | undefined, fallback: number) => (value && Number.isFinite(Number(value)) ? Number(value) : fallback);

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const envFile = `${PACKAGE_DIR}.env`;
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const env = process.env;
  return {
    apiKey: env.RIOT_API_KEY ?? '',
    platforms: (env.LOL_STATS_PLATFORMS || DEFAULT_PLATFORMS.join(',')).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean) as Platform[],
    pagesPerDivision: num(env.LOL_STATS_PAGES_PER_DIVISION, 0),
    /** Look-back of the very first pass (current and previous patch), refined by the patch boundary seen in the data. */
    firstPassDays: num(env.LOL_STATS_FIRST_PASS_DAYS, 35),
    budgetMinutes: num(env.LOL_STATS_BUDGET_MINUTES, 50),
    playerConcurrency: num(env.LOL_STATS_PLAYER_CONCURRENCY, 16),
    matchConcurrency: 4,
    flushGames: num(env.LOL_STATS_FLUSH_GAMES, 1000),
    flushMinutes: num(env.LOL_STATS_FLUSH_MINUTES, 5),
    maxGames: num(env.LOL_STATS_MAX_GAMES, 0),
    minGameSeconds: 15 * 60,
    minBuildGames: num(env.LOL_STATS_MIN_BUILD_GAMES, 50),
    minBuildShare: num(env.LOL_STATS_MIN_BUILD_SHARE, 0.03),
    offMetaMinShare: num(env.LOL_STATS_OFF_META_MIN_SHARE, 0.005),
    offMetaMinGames: num(env.LOL_STATS_OFF_META_MIN_GAMES, 30),
    offMetaWinRateGap: num(env.LOL_STATS_OFF_META_WIN_RATE_GAP, 0.01),
    altMinShare: num(env.LOL_STATS_ALT_MIN_SHARE, 0.08),
    altMinGames: num(env.LOL_STATS_ALT_MIN_GAMES, 3),
    lateShare: num(env.LOL_STATS_LATE_SHARE, 0.7),
    minMatchupGames: num(env.LOL_STATS_MIN_MATCHUP_GAMES, 50),
    minCounterGames: num(env.LOL_STATS_MIN_COUNTER_GAMES, 20),
    minGamesForNewPatch: num(env.LOL_STATS_MIN_GAMES_NEW_PATCH, 200),
    lowSampleGames: num(env.LOL_STATS_LOW_SAMPLE_GAMES, 200),
    mainRoleShare: num(env.LOL_STATS_MAIN_ROLE_SHARE, DEFAULT_MAIN_ROLE_SHARE),
    pools: {
      low: { pages: num(env.LOL_STATS_BAND_PAGES_LOW, 2), games: num(env.LOL_STATS_BAND_GAMES_LOW, 4000), gamesPerPlayer: num(env.LOL_STATS_BAND_GAMES_PER_PLAYER, 20) },
      mid: { pages: num(env.LOL_STATS_BAND_PAGES_MID, 2), games: num(env.LOL_STATS_BAND_GAMES_MID, 2500), gamesPerPlayer: num(env.LOL_STATS_BAND_GAMES_PER_PLAYER, 20) },
    },
    tierPickWeight: num(env.LOL_STATS_TIER_PICK_WEIGHT, 0.06),
    tierPickCap: num(env.LOL_STATS_TIER_PICK_CAP, 10),
    tierCuts: env.LOL_STATS_TIER_CUTS ? env.LOL_STATS_TIER_CUTS.split(',').map(Number) : [0.08, 0.22, 0.45, 0.7, 0.88],
    sample: env.LOL_STATS_SAMPLE === '1',
    stateDir: env.LOL_STATS_STATE_DIR ?? `${PACKAGE_DIR}.state`,
    outputDir: env.LOL_STATS_OUTPUT_DIR ?? `${REPO_DIR}public/data/lol/builds`,
    tierListDir: env.LOL_STATS_TIERLIST_DIR ?? `${REPO_DIR}public/data/lol/tierlist`,
    ...overrides,
  };
}
