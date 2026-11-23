import type { TftRankFilter } from '../../../../src/app/tft/logic/tft-types.ts';
import { filtersOfTier } from '../config.ts';
import type { BoardRecord } from '../extract.ts';
import type { SetData } from '../static.ts';

/** A board ready for the statistics: champion forms folded into their champion, items mapped to the catalogue. */
export interface Board {
  placement: number;
  level: number;
  filters: readonly TftRankFilter[];
  units: Array<{ id: string; stars: number; items: string[]; completed: number }>;
  /** Distinct champions. */
  champions: Set<string>;
  /** Main trait: the active non-unique trait with the best tier, then the most units (null: none). */
  trait: string | null;
  /** Unit holding the most completed items (null: no completed item). */
  carry: string | null;
}

export function toBoard(r: BoardRecord, data: SetData): Board {
  const units: Board['units'] = [];
  for (const [raw, stars, rawItems] of r.u) {
    const id = data.baseOf(raw);
    if (!id) continue;
    const items = rawItems.map((i) => data.itemOf(i)).filter((i): i is string => !!i);
    units.push({ id, stars, items, completed: items.filter((i) => data.isCompleted(i)).length });
  }
  let trait: string | null = null;
  let best = -1;
  for (const [id, count, style] of r.tr) {
    const t = data.traits.get(id);
    if (!t || style <= 0 || t.breakpoints.length < 2) continue;
    const score = style * 100 + count;
    if (score > best || (score === best && trait !== null && id < trait)) {
      best = score;
      trait = id;
    }
  }
  let carry: string | null = null;
  let carryScore = 0;
  for (const u of units) {
    const score = u.completed * 100 + data.cost(u.id) * 10 + u.stars;
    if (u.completed > 0 && score > carryScore) {
      carryScore = score;
      carry = u.id;
    }
  }
  return { placement: r.pl, level: r.lv, filters: filtersOfTier(r.t), units, champions: new Set(units.map((u) => u.id)), trait, carry };
}

export const median = (values: readonly number[]): number => {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

export function mode<T>(values: Iterable<T>): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
