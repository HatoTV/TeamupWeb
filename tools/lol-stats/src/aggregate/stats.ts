/** Lower bound of the 95 % Wilson score interval of a win rate (0 when n = 0). */
export function wilsonLower(wins: number, games: number, z = 1.96): number {
  if (games <= 0) return 0;
  const p = wins / games;
  const z2 = z * z;
  const centre = p + z2 / (2 * games);
  const margin = z * Math.sqrt((p * (1 - p)) / games + z2 / (4 * games * games));
  return (centre - margin) / (1 + z2 / games);
}

/** Standard scores of a list (all 0 when the spread is 0). */
export function zScores(values: readonly number[]): number[] {
  if (!values.length) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  return values.map((v) => (sd > 0 ? (v - mean) / sd : 0));
}

export const TIERS = ['S+', 'S', 'A', 'B', 'C', 'D'] as const;
export type TierRank = (typeof TIERS)[number];

/** Share of champions (best first) in each tier, cumulative: S+ top 5 %, S next 15 %, A 25 %, B 25 %, C 20 %, D 10 %. */
const TIER_CUTS: ReadonlyArray<[TierRank, number]> = [
  ['S+', 0.05],
  ['S', 0.2],
  ['A', 0.45],
  ['B', 0.7],
  ['C', 0.9],
  ['D', 1],
];

/**
 * Tier score (documented in the README):
 *   score = z(Wilson lower bound of the win rate) + 0.5 × z(ln pick rate) + 0.25 × z(ban rate)
 * computed among the champions of one role, then cut into percentiles.
 */
export function tierScores(entries: ReadonlyArray<{ wins: number; games: number; pickRate: number; banRate: number }>): number[] {
  const wl = zScores(entries.map((e) => wilsonLower(e.wins, e.games)));
  const pick = zScores(entries.map((e) => Math.log(Math.max(e.pickRate, 1e-6))));
  const ban = zScores(entries.map((e) => e.banRate));
  return entries.map((_, i) => wl[i]! + 0.5 * pick[i]! + 0.25 * ban[i]!);
}

export function tierRanks(scores: readonly number[]): TierRank[] {
  const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]);
  const ranks: TierRank[] = new Array(scores.length);
  order.forEach(([, index], position) => {
    const percentile = (position + 1) / scores.length;
    ranks[index] = TIER_CUTS.find(([, cut]) => percentile <= cut + 1e-9)![0];
  });
  return ranks;
}

/** Histogram with fixed-width buckets (e.g. 10 s) to compute medians without storing every value. */
export class Histogram {
  readonly bucket: number;
  readonly counts = new Map<number, number>();
  total = 0;

  constructor(bucket: number) {
    this.bucket = bucket;
  }

  add(value: number): void {
    const b = Math.floor(value / this.bucket);
    this.counts.set(b, (this.counts.get(b) ?? 0) + 1);
    this.total++;
  }

  /** Median (bucket centre), or null when empty. */
  median(): number | null {
    if (!this.total) return null;
    const half = this.total / 2;
    let seen = 0;
    for (const b of [...this.counts.keys()].sort((x, y) => x - y)) {
      seen += this.counts.get(b)!;
      if (seen >= half) return b * this.bucket + this.bucket / 2;
    }
    return null;
  }
}

export const rate = (part: number, total: number) => (total > 0 ? part / total : 0);
export const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;
