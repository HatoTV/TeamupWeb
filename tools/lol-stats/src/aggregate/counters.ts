import { rate, round } from './stats.ts';

/** Games and wins against one lane opponent, with the gold lead at 15:00 when the timeline had it. */
export interface OpponentCount {
  games: number;
  wins: number;
  /** Sum of the gold leads at 15:00 and number of games that had one. */
  goldSum: number;
  goldGames: number;
}

export interface CounterEntry {
  championId: number;
  games: number;
  wins: number;
  /** Win rate of the page's champion against this opponent. */
  winRate: number;
  /** Mean gold lead of the page's champion at 15:00 (rounded), when enough games had a timeline. */
  goldDiff15?: number;
}

export interface Counters {
  /** winRate ≥ 50 %, best first. */
  advantage: CounterEntry[];
  /** winRate < 50 %, worst first. */
  counter: CounterEntry[];
}

/**
 * Every lane opponent with at least `minGames` games, split into « Advantage » (win rate ≥ 50 %, highest first) and
 * « Counter » (win rate < 50 %, lowest first). The split uses the published (rounded) win rate; ties by games.
 * `goldDiff15` is published once `minGames` games of the matchup had a timeline.
 */
export function splitCounters(opponents: Iterable<[number, OpponentCount]>, minGames: number): Counters {
  const entries: CounterEntry[] = [];
  for (const [championId, o] of opponents) {
    if (o.games < minGames) continue;
    entries.push({
      championId,
      games: o.games,
      wins: o.wins,
      winRate: round(rate(o.wins, o.games)),
      ...(o.goldGames >= minGames ? { goldDiff15: Math.round(o.goldSum / o.goldGames) } : {}),
    });
  }
  const tie = (a: CounterEntry, b: CounterEntry) => b.games - a.games || a.championId - b.championId;
  return {
    advantage: entries.filter((e) => e.winRate >= 0.5).sort((a, b) => b.winRate - a.winRate || tie(a, b)),
    counter: entries.filter((e) => e.winRate < 0.5).sort((a, b) => a.winRate - b.winRate || tie(a, b)),
  };
}
