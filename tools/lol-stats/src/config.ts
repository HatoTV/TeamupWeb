import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Platform } from './riot/routing.ts';

export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
export const REPO_DIR = fileURLToPath(new URL('../../..', import.meta.url));

/**
 * Rank filters shown on the site: `*_plus` include every tier above (lowest first), the others a single tier
 * (`challenger` is both). A player's games count in the filters of his own tier.
 */
export const TIER_FILTERS = ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger', 'emerald', 'diamond', 'master', 'grandmaster'] as const;
export type TierFilter = (typeof TIER_FILTERS)[number];

/** Riot tiers we sample, highest first. */
export const SAMPLED_TIERS = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD'] as const;
export type SampledTier = (typeof SAMPLED_TIERS)[number];

/** Filters a player of a given tier belongs to. */
export function filtersForTier(tier: SampledTier): TierFilter[] {
  const rank = SAMPLED_TIERS.indexOf(tier); // 0 = challenger … 4 = emerald
  const filters: TierFilter[] = ['emerald_plus'];
  if (rank <= 3) filters.push('diamond_plus');
  if (rank <= 2) filters.push('master_plus');
  if (rank <= 1) filters.push('grandmaster_plus');
  if (rank === 0) filters.push('challenger');
  else filters.push(tier.toLowerCase() as TierFilter);
  return filters;
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
  /** Build candidates need max(minBuildGames, minBuildShare × games of the champion in the role). */
  minBuildGames: number;
  minBuildShare: number;
  /** Lane opponents / duo partners need at least this many games. */
  minMatchupGames: number;
  /** Best players need at least this many games on the champion and role. */
  minPlayerGames: number;
  /** A new patch is shown once a champion / role reaches this many games. */
  minGamesForNewPatch: number;
  /** A filter below this many games shows the "few games" warning. */
  lowSampleGames: number;
  /** Published data is a small sample (development key): the site shows a "sample data" notice. */
  sample: boolean;
  stateDir: string;
  outputDir: string;
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
    playerConcurrency: num(env.LOL_STATS_PLAYER_CONCURRENCY, 8),
    matchConcurrency: 4,
    flushGames: num(env.LOL_STATS_FLUSH_GAMES, 1000),
    flushMinutes: num(env.LOL_STATS_FLUSH_MINUTES, 5),
    maxGames: num(env.LOL_STATS_MAX_GAMES, 0),
    minGameSeconds: 15 * 60,
    minBuildGames: num(env.LOL_STATS_MIN_BUILD_GAMES, 100),
    minBuildShare: 0.03,
    minMatchupGames: num(env.LOL_STATS_MIN_MATCHUP_GAMES, 50),
    minPlayerGames: 15,
    minGamesForNewPatch: num(env.LOL_STATS_MIN_GAMES_NEW_PATCH, 200),
    lowSampleGames: num(env.LOL_STATS_LOW_SAMPLE_GAMES, 200),
    sample: env.LOL_STATS_SAMPLE === '1',
    stateDir: env.LOL_STATS_STATE_DIR ?? `${PACKAGE_DIR}.state`,
    outputDir: env.LOL_STATS_OUTPUT_DIR ?? `${REPO_DIR}public/data/lol/builds`,
    ...overrides,
  };
}
