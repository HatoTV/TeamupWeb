import type { ChampionBuild, CounterStat } from '../../../core/data/build-data.service';
import type { DifficultyLevel } from '../../../shared/ui/difficulty/matchup-difficulty';

/** Same threshold as `LOL_STATS_MIN_COUNTER_GAMES` (tools/lol-stats): fewer games, the opponent is not listed. */
export const MIN_COUNTER_GAMES = 20;

/**
 * Difficulty deduced from the win rate when the matchup has no TeamUpp rating: ≥ 56 % very easy, ≥ 52.5 % easy,
 * ≥ 48.5 % even, ≥ 45 % hard, else extreme.
 */
export const WIN_RATE_LEVELS: ReadonlyArray<[number, DifficultyLevel]> = [
  [0.56, 1],
  [0.525, 2],
  [0.485, 3],
  [0.45, 4],
];

export function levelFromWinRate(winRate: number): DifficultyLevel {
  return WIN_RATE_LEVELS.find(([min]) => winRate >= min - 1e-9)?.[1] ?? 5;
}

export interface CounterColumns {
  /** Win rate ≥ 50 %, highest first. */
  advantage: CounterStat[];
  /** Win rate < 50 %, lowest first. */
  counter: CounterStat[];
}

/** Splits and sorts the opponents like tools/lol-stats (`splitCounters`). */
export function splitColumns(list: readonly CounterStat[], minGames = MIN_COUNTER_GAMES): CounterColumns {
  const kept = list.filter((o) => o.games >= minGames);
  const tie = (a: CounterStat, b: CounterStat) => b.games - a.games || a.championId - b.championId;
  return {
    advantage: kept.filter((o) => o.winRate >= 0.5).sort((a, b) => b.winRate - a.winRate || tie(a, b)),
    counter: kept.filter((o) => o.winRate < 0.5).sort((a, b) => a.winRate - b.winRate || tie(a, b)),
  };
}

/**
 * Columns of a build file. Files published before the counters tab only have the six weakest and strongest
 * opponents: they are used with the same threshold and split until the next publication.
 */
export function counterColumns(file: Pick<ChampionBuild, 'counters' | 'weakAgainst' | 'strongAgainst'> | null): CounterColumns {
  if (!file) return { advantage: [], counter: [] };
  if (file.counters) return splitColumns([...file.counters.advantage, ...file.counters.counter]);
  const seen = new Map<number, CounterStat>();
  for (const o of [...file.weakAgainst, ...file.strongAgainst]) {
    seen.set(o.champion, { championId: o.champion, games: o.games, wins: Math.round(o.winRate * o.games), winRate: o.winRate });
  }
  return splitColumns([...seen.values()]);
}

/** Width of the gap bar, in %: 8 points away from 50 % fill it. */
export function gapWidth(winRate: number): number {
  return Math.min(100, (Math.abs(winRate * 100 - 50) / 8) * 100);
}

/** The `n` most played opponents of both columns. */
export function mostPlayed<T extends { games: number }>(rows: readonly T[], n = 5): T[] {
  return [...rows].sort((a, b) => b.games - a.games).slice(0, n);
}
