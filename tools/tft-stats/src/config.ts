import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Platform } from '../../lol-stats/src/riot/routing.ts';
import type { TftQueue, TftRankFilter, TftTier } from '../../../src/app/tft/logic/tft-types.ts';

export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
export const REPO_DIR = fileURLToPath(new URL('../../..', import.meta.url));

/** Riot queue ids of the collected games. */
export const QUEUE_IDS: Record<TftQueue, number> = { ranked: 1100, double_up: 1160 };
/** tft-league-v1 queue names. */
export const LEAGUE_QUEUES: Record<TftQueue, string> = { ranked: 'RANKED_TFT', double_up: 'RANKED_TFT_DOUBLE_UP' };
export const queueOfId = (id: number): TftQueue | null => (id === 1100 ? 'ranked' : id === 1160 ? 'double_up' : null);

/** Collected tiers, highest first. */
export const TIERS = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD', 'PLATINUM'] as const;
export type Tier = (typeof TIERS)[number];
export const APEX_TIERS = ['CHALLENGER', 'GRANDMASTER', 'MASTER'] as const;
export const DIVISION_TIERS = ['DIAMOND', 'EMERALD', 'PLATINUM'] as const;

/** Rank filters of the site, widest first (« Platine + » by default). */
export const RANK_FILTERS: readonly TftRankFilter[] = ['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus'];
const FILTER_FLOOR: Record<TftRankFilter, number> = { platinum_plus: 5, emerald_plus: 4, diamond_plus: 3, master_plus: 2 };
/** Filters a board of a player of `tier` counts in. */
export const filtersOfTier = (tier: Tier): TftRankFilter[] => RANK_FILTERS.filter((f) => TIERS.indexOf(tier) <= FILTER_FLOOR[f]);

export interface TierCuts {
  /** Upper bound of the adjusted average placement for S, A and B; above: C. */
  S: number;
  A: number;
  B: number;
}

export interface Config {
  apiKey: string;
  platforms: Platform[];
  queues: TftQueue[];
  set: number;
  stateDir: string;
  budgetMinutes: number;
  playerConcurrency: number;
  /** Pages of 205 players per division for Diamond, Emerald and Platinum (0 = all). */
  pagesPerDivision: Record<(typeof DIVISION_TIERS)[number], number>;
  /** Most recent games looked up per player and per pass. */
  gamesPerPlayer: number;
  flushGames: number;
  flushMinutes: number;
  /** Boards needed for a comp to be shown (per rank filter). */
  minCompGames: number;
  /** Seeds of the clustering: share of minCompGames. */
  seedShare: number;
  /** Weighted similarity above which two comps merge, and below which a board joins no comp. */
  mergeSimilarity: number;
  minSimilarity: number;
  /** Item × champion, trio and variant thresholds. */
  minItemGames: number;
  minHolderGames: number;
  minTrioGames: number;
  minVariantGames: number;
  /** Volume correction: boards of « average » weight added to every average placement. */
  shrinkGames: number;
  cuts: { comps: TierCuts; champions: TierCuts; items: TierCuts; compat: TierCuts };
}

function readDotEnv(): Record<string, string> {
  const file = `${PACKAGE_DIR}.env`;
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^\s*[A-Z0-9_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
}

const num = (env: Record<string, string | undefined>, name: string, fallback: number) => {
  const v = env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number`);
  return n;
};

const cuts = (env: Record<string, string | undefined>, name: string, fallback: [number, number, number]): TierCuts => {
  const [S, A, B] = (env[name] ? env[name]!.split(',').map(Number) : fallback) as [number, number, number];
  if (![S, A, B].every(Number.isFinite) || !(S < A && A < B)) throw new Error(`${name}: three increasing numbers expected`);
  return { S, A, B };
};

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const env: Record<string, string | undefined> = { ...readDotEnv(), ...process.env };
  const current = JSON.parse(readFileSync(`${REPO_DIR}public/data/tft/static/current.json`, 'utf8')) as { set: number };
  return {
    // A TFT product key (RIOT_TFT_API_KEY) when it exists, the LoL key otherwise (development keys cover both games).
    apiKey: env['RIOT_TFT_API_KEY'] || env['RIOT_API_KEY'] || '',
    platforms: (env['TFT_STATS_PLATFORMS'] || 'EUW1,KR,NA1').split(',').map((p) => p.trim()) as Platform[],
    queues: (env['TFT_STATS_QUEUES'] || 'ranked,double_up').split(',').map((q) => q.trim()) as TftQueue[],
    set: num(env, 'TFT_SET', current.set),
    stateDir: env['TFT_STATS_STATE_DIR'] || `${PACKAGE_DIR}.state`,
    budgetMinutes: num(env, 'TFT_STATS_BUDGET_MINUTES', 45),
    playerConcurrency: num(env, 'TFT_STATS_PLAYER_CONCURRENCY', 12),
    pagesPerDivision: {
      DIAMOND: num(env, 'TFT_STATS_PAGES_DIAMOND', 0),
      EMERALD: num(env, 'TFT_STATS_PAGES_EMERALD', 0),
      PLATINUM: num(env, 'TFT_STATS_PAGES_PLATINUM', 5),
    },
    gamesPerPlayer: num(env, 'TFT_STATS_GAMES_PER_PLAYER', 20),
    flushGames: num(env, 'TFT_STATS_FLUSH_GAMES', 2000),
    flushMinutes: num(env, 'TFT_STATS_FLUSH_MINUTES', 5),
    minCompGames: num(env, 'TFT_STATS_MIN_COMP_GAMES', 2000),
    seedShare: num(env, 'TFT_STATS_SEED_SHARE', 0.25),
    mergeSimilarity: num(env, 'TFT_STATS_MERGE_SIMILARITY', 0.72),
    minSimilarity: num(env, 'TFT_STATS_MIN_SIMILARITY', 0.45),
    minItemGames: num(env, 'TFT_STATS_MIN_ITEM_GAMES', 200),
    minHolderGames: num(env, 'TFT_STATS_MIN_HOLDER_GAMES', 100),
    minTrioGames: num(env, 'TFT_STATS_MIN_TRIO_GAMES', 50),
    minVariantGames: num(env, 'TFT_STATS_MIN_VARIANT_GAMES', 100),
    shrinkGames: num(env, 'TFT_STATS_SHRINK_GAMES', 100),
    cuts: {
      comps: cuts(env, 'TFT_STATS_CUTS_COMPS', [4.15, 4.35, 4.55]),
      champions: cuts(env, 'TFT_STATS_CUTS_CHAMPIONS', [4.25, 4.45, 4.6]),
      items: cuts(env, 'TFT_STATS_CUTS_ITEMS', [4.2, 4.4, 4.6]),
      compat: cuts(env, 'TFT_STATS_CUTS_COMPAT', [4.1, 4.3, 4.5]),
    },
    ...overrides,
  };
}

export const tierOf = (avg: number, c: TierCuts): TftTier => (avg <= c.S ? 'S' : avg <= c.A ? 'A' : avg <= c.B ? 'B' : 'C');
