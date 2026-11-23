import type { PlacementStats, TftTier } from '../../../../src/app/tft/logic/tft-types.ts';
import { tierOf, type TierCuts } from '../config.ts';

/** Placement accumulator. */
export class Acc {
  n = 0;
  sum = 0;
  top4 = 0;
  win = 0;

  add(placement: number): this {
    this.n++;
    this.sum += placement;
    if (placement <= 4) this.top4++;
    if (placement === 1) this.win++;
    return this;
  }

  get avg(): number {
    return this.n ? this.sum / this.n : 0;
  }

  /** Average without the boards of `other` (a subset of these boards). */
  avgWithout(other: Acc): number | null {
    const n = this.n - other.n;
    return n > 0 ? (this.sum - other.sum) / n : null;
  }

  stats(): PlacementStats {
    return { games: this.n, avg: round(this.avg, 3), top4: round(this.n ? this.top4 / this.n : 0, 4), win: round(this.n ? this.win / this.n : 0, 4) };
  }
}

export const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

/** Expected average placement of a board taken at random (1 to 8). */
export const MEAN_PLACEMENT = 4.5;

/**
 * Average placement corrected by volume: `shrink` boards placed 4.5 are added, so a small sample moves toward the
 * average and cannot reach the top tier by luck.
 */
export const adjustedAvg = (acc: Pick<Acc, 'n' | 'sum'>, shrink: number) => (acc.sum + shrink * MEAN_PLACEMENT) / (acc.n + shrink);

export const tierFor = (acc: Pick<Acc, 'n' | 'sum'>, shrink: number, cuts: TierCuts): TftTier => tierOf(adjustedAvg(acc, shrink), cuts);

/** Get-or-create in a map. */
export function upsert<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  let v = map.get(key);
  if (v === undefined) map.set(key, (v = create()));
  return v;
}
