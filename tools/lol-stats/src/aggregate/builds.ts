import { wilsonLower } from './stats.ts';

export interface BuildCandidate {
  /** Sorted ids of the first three major items, joined by "-". */
  key: string;
  games: number;
  wins: number;
  /** Purchase orders seen for this key ("a-b-c" → games). */
  orders: Map<string, number>;
}

export type BuildLabel = 'most_played' | 'best_winrate' | 'alternative';

export interface SelectedBuild extends BuildCandidate {
  label: BuildLabel;
  /** Most frequent purchase order of the three items. */
  core: number[];
}

export interface BuildRules {
  minBuildGames: number;
  minBuildShare: number;
}

const itemsOf = (key: string) => key.split('-').map(Number);

function mostFrequentOrder(candidate: BuildCandidate): number[] {
  let best = '';
  let bestCount = -1;
  for (const [order, count] of candidate.orders) {
    if (count > bestCount || (count === bestCount && order < best)) {
      best = order;
      bestCount = count;
    }
  }
  return best ? itemsOf(best) : itemsOf(candidate.key);
}

/**
 * Hato's rule, at most three distinct builds:
 *  1. most played: the candidate with the most games;
 *  2. best win rate: highest 95 % Wilson lower bound among the others;
 *  3. alternative: the next most played with at least one core item absent from builds 1 and 2.
 * Candidates need max(minBuildGames, minBuildShare × games of the champion in the role).
 * Fewer candidates → fewer builds; under-played builds are never used to fill the list.
 */
export function selectBuilds(candidates: readonly BuildCandidate[], championRoleGames: number, rules: BuildRules): SelectedBuild[] {
  const threshold = Math.max(rules.minBuildGames, rules.minBuildShare * championRoleGames);
  const eligible = candidates.filter((c) => c.games >= threshold).sort((a, b) => b.games - a.games || a.key.localeCompare(b.key));
  if (!eligible.length) return [];

  const selected: SelectedBuild[] = [];
  const mostPlayed = eligible[0]!;
  selected.push({ ...mostPlayed, label: 'most_played', core: mostFrequentOrder(mostPlayed) });

  const others = eligible.slice(1);
  const best = [...others].sort((a, b) => wilsonLower(b.wins, b.games) - wilsonLower(a.wins, a.games) || b.games - a.games)[0];
  if (best) selected.push({ ...best, label: 'best_winrate', core: mostFrequentOrder(best) });

  const used = new Set(selected.flatMap((s) => itemsOf(s.key)));
  const alternative = others.find((c) => c !== best && itemsOf(c.key).some((id) => !used.has(id)));
  if (alternative) selected.push({ ...alternative, label: 'alternative', core: mostFrequentOrder(alternative) });

  return selected;
}
