import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Platform } from './riot/routing.ts';

export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
export const REPO_DIR = fileURLToPath(new URL('../../..', import.meta.url));

/** Rank filters shown on the site, lowest first. Each one includes every tier above it. */
export const TIER_FILTERS = ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger'] as const;
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
  return filters;
}

export interface Config {
  apiKey: string;
  platforms: Platform[];
  /** League pages sampled per Diamond / Emerald division (205 entries per page). */
  pagesPerDivision: number;
  /** Wall-clock budget of one crawl, in minutes. */
  budgetMinutes: number;
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
    platforms: (env.LOL_STATS_PLATFORMS ?? 'EUW1').split(',').map((p) => p.trim().toUpperCase()) as Platform[],
    pagesPerDivision: num(env.LOL_STATS_PAGES_PER_DIVISION, 5),
    budgetMinutes: num(env.LOL_STATS_BUDGET_MINUTES, 35),
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
