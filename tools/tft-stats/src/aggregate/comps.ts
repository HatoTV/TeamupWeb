import type { CompItemStat, LevelStyle, TftComp } from '../../../../src/app/tft/logic/tft-types.ts';
import type { Config } from '../config.ts';
import type { SetData } from '../static.ts';
import { median, mode, type Board } from './boards.ts';
import { Acc, round, tierFor, upsert } from './stats.ts';

// ---------- clustering ----------

/** Frequency of each champion in a group of boards (index = champion index). */
type Vec = Float64Array;

interface Centroid {
  vec: Vec;
  trait: string | null;
  /** Σ weight × frequency of the champions present in at least half of the boards. */
  coreSum: number;
}

/**
 * Groups final boards into comps. Seeds: boards sharing their main trait and main carry; seeds whose champions are
 * alike merge; then every board joins the most similar comp (similarity of the champions weighted by their cost, plus
 * a bonus for the same main trait), three times, centroids recomputed each time. Boards too far from every comp
 * (or with fewer than 4 champions) join none.
 * Returns the boards of each comp, largest first.
 */
export function clusterBoards(boards: readonly Board[], data: SetData, config: Pick<Config, 'minCompGames' | 'seedShare' | 'mergeSimilarity' | 'minSimilarity'>): Board[][] {
  const ids = [...data.champions.values()].filter((c) => !c.variantOf).map((c) => c.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const weight = Float64Array.from(ids, (id) => data.cost(id));
  const eligible = boards.filter((b) => b.champions.size >= 4);
  const encoded = eligible.map((b) => Int32Array.from([...b.champions].map((c) => index.get(c) ?? -1).filter((i) => i >= 0)));

  const centroidOf = (members: readonly number[], trait: string | null): Centroid => {
    const vec = new Float64Array(ids.length);
    for (const m of members) for (const i of encoded[m]!) vec[i]! += 1;
    let coreSum = 0;
    for (let i = 0; i < vec.length; i++) {
      vec[i] = members.length ? vec[i]! / members.length : 0;
      if (vec[i]! >= 0.5) coreSum += weight[i]! * vec[i]!;
    }
    return { vec, trait, coreSum };
  };

  /** Weighted Jaccard of a board and a centroid (fuzzy set of champions). */
  const similarity = (m: number, c: Centroid): number => {
    let num = 0;
    let boardWeight = 0;
    let coreInBoard = 0;
    for (const i of encoded[m]!) {
      const f = c.vec[i]!;
      num += weight[i]! * f;
      boardWeight += weight[i]!;
      if (f >= 0.5) coreInBoard += weight[i]! * f;
    }
    const den = boardWeight + c.coreSum - coreInBoard;
    const s = den > 0 ? num / den : 0;
    return Math.min(1, s + (eligible[m]!.trait && eligible[m]!.trait === c.trait ? 0.1 : 0));
  };

  const vecSimilarity = (a: Vec, b: Vec): number => {
    let min = 0;
    let max = 0;
    for (let i = 0; i < a.length; i++) {
      min += weight[i]! * Math.min(a[i]!, b[i]!);
      max += weight[i]! * Math.max(a[i]!, b[i]!);
    }
    return max > 0 ? min / max : 0;
  };

  // Seeds: main trait × main carry.
  const seeds = new Map<string, number[]>();
  eligible.forEach((b, m) => {
    if (b.trait && b.carry) upsert(seeds, `${b.trait}|${b.carry}`, () => []).push(m);
  });
  const minSeed = Math.max(1, Math.round(config.minCompGames * config.seedShare));
  const groups: Array<{ members: number[]; trait: string | null; centroid: Centroid }> = [];
  for (const [key, members] of [...seeds].filter(([, m]) => m.length >= minSeed).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    const trait = key.split('|')[0]!;
    const centroid = centroidOf(members, trait);
    const twin = groups.find((g) => vecSimilarity(g.centroid.vec, centroid.vec) >= config.mergeSimilarity);
    if (twin) {
      twin.members.push(...members);
      twin.centroid = centroidOf(twin.members, twin.trait);
    } else groups.push({ members: [...members], trait, centroid });
  }
  if (!groups.length) return [];

  // Assignment, three passes.
  let assignment: number[][] = groups.map((g) => g.members);
  for (let pass = 0; pass < 3; pass++) {
    const centroids = assignment.map((members, g) => centroidOf(members, groups[g]!.trait));
    const next: number[][] = groups.map(() => []);
    for (let m = 0; m < eligible.length; m++) {
      let best = -1;
      let bestScore = config.minSimilarity;
      for (let g = 0; g < centroids.length; g++) {
        if (!assignment[g]!.length) continue;
        const s = similarity(m, centroids[g]!);
        if (s > bestScore) {
          bestScore = s;
          best = g;
        }
      }
      if (best >= 0) next[best]!.push(m);
    }
    assignment = next;
  }
  return assignment
    .filter((members) => members.length)
    .sort((a, b) => b.length - a.length)
    .map((members) => members.map((m) => eligible[m]!));
}

// ---------- description of a comp ----------

const slug = (s: string) => s.toLowerCase().replace(/^(da|tft)\d*_/, '').replace(/^\d+_/, '').replace(/\d+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Comp of a group of boards (one rank filter), or null below `minCompGames`.
 * - name: most frequent main trait + champion holding the most completed items on average;
 * - main version: the champions of at least half of the games, as many as the median final level (7 to 10);
 * - carries: the three champions that most often hold three items, with their items in this comp;
 * - variants: a non-main champion often played instead of a main one (« replace X with Y at level N »).
 */
export function describeComp(members: readonly Board[], totalBoards: number, data: SetData, config: Pick<Config, 'minCompGames' | 'minVariantGames' | 'shrinkGames' | 'cuts'>): Omit<TftComp, 'id'> | null {
  const n = members.length;
  if (n < config.minCompGames || n === 0) return null;
  const acc = new Acc();
  for (const b of members) acc.add(b.placement);

  // Frequency, stars and completed items of each champion.
  const presence = new Map<string, number>();
  const stars = new Map<string, number[]>();
  const completed = new Map<string, number>();
  const threeItems = new Map<string, number>();
  for (const b of members) {
    for (const c of b.champions) presence.set(c, (presence.get(c) ?? 0) + 1);
    const seen = new Set<string>();
    for (const u of b.units) {
      if (seen.has(u.id)) continue; // a second copy is a bench duplicate
      seen.add(u.id);
      upsert(stars, u.id, () => []).push(u.stars);
      completed.set(u.id, (completed.get(u.id) ?? 0) + u.completed);
      if (u.items.length >= 3) threeItems.set(u.id, (threeItems.get(u.id) ?? 0) + 1);
    }
  }
  const avgLevel = members.reduce((s, b) => s + b.level, 0) / n;
  const size = Math.min(10, Math.max(7, Math.round(median(members.map((b) => b.level)))));
  const byFrequency = [...presence].sort((a, b) => b[1] - a[1] || data.cost(b[0]) - data.cost(a[0]) || a[0].localeCompare(b[0]));
  // Core units (at least half of the games), completed up to 6 with the next most frequent ones (at least a quarter).
  const core = byFrequency.filter(([, count]) => count / n >= 0.5).slice(0, size);
  const fill = byFrequency.filter(([, count]) => count / n >= 0.25 && count / n < 0.5).slice(0, Math.max(0, 6 - core.length));
  const main = [...core, ...fill].map(([id]) => id);
  const mainSet = new Set(main);

  const trait = mode(members.map((b) => b.trait).filter((t): t is string => !!t)) ?? '';
  const carry = [...main].sort((a, b) => (completed.get(b) ?? 0) / (presence.get(b) ?? 1) - (completed.get(a) ?? 0) / (presence.get(a) ?? 1) || data.cost(b) - data.cost(a))[0] ?? main[0] ?? '';

  // Carries and their items.
  const carries = [...main]
    .filter((id) => (threeItems.get(id) ?? 0) / n >= 0.1)
    .sort((a, b) => (threeItems.get(b) ?? 0) - (threeItems.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, 3)
    .map((unit) => {
      const items = new Map<string, Acc>();
      for (const b of members) {
        const held = new Set(b.units.filter((u) => u.id === unit).flatMap((u) => u.items));
        for (const item of held) upsert(items, item, () => new Acc()).add(b.placement);
      }
      const present = presence.get(unit) ?? 1;
      const ranked: CompItemStat[] = [...items]
        .sort((a, b) => b[1].n - a[1].n || a[1].avg - b[1].avg || a[0].localeCompare(b[0]))
        .map(([item, a]) => ({ item, share: round(a.n / present, 4), avg: round(a.avg, 3) }));
      return { unit, items: ranked.slice(0, 3), alternatives: ranked.slice(3).filter((i) => i.share >= 0.03).slice(0, 2) };
    });

  // Level and style.
  const carryCost = data.cost(carry);
  const carryThreeStars = (stars.get(carry) ?? []).filter((s) => s >= 3).length / Math.max(1, presence.get(carry) ?? 1);
  const level = Math.round(avgLevel);
  const levelStyle: LevelStyle =
    carryCost <= 3 && carryThreeStars >= 0.5 ? { kind: 'reroll', level } : avgLevel >= 8.6 ? { kind: 'fast9', level: 9 } : avgLevel >= 7.8 ? { kind: 'fast8', level: 8 } : { kind: 'level', level };

  // Difficulty: legendary units to find, fast 9, a 3-star 3-cost carry, an emblem among the carry items.
  let points = Math.max(0, main.filter((id) => data.cost(id) === 5).length - 1);
  if (levelStyle.kind === 'fast9') points++;
  if (levelStyle.kind === 'reroll' && carryCost === 3) points++;
  if (carries.some((c) => c.items.some((i) => data.items.get(i.item)?.kind === 'emblem'))) points++;
  const difficulty = (points <= 0 ? 1 : points === 1 ? 2 : 3) as 1 | 2 | 3;

  // Variants.
  const variants: TftComp['variants'] = [];
  for (const out of main) {
    const without = members.filter((b) => !b.champions.has(out));
    if (without.length < config.minVariantGames) continue;
    const replacements = new Map<string, Board[]>();
    for (const b of without) for (const c of b.champions) if (!mainSet.has(c)) upsert(replacements, c, () => []).push(b);
    const best = [...replacements].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
    if (!best || best[1].length < config.minVariantGames || best[1].length / without.length < 0.3) continue;
    const a = new Acc();
    for (const b of best[1]) a.add(b.placement);
    variants.push({ out, in: best[0], level: Math.round(median(best[1].map((b) => b.level))), games: best[1].length, avg: round(a.avg, 3) });
  }
  variants.sort((a, b) => b.games - a.games);
  const usedIn = new Set<string>();
  const distinctVariants = variants.filter((v) => (usedIn.has(v.in) ? false : (usedIn.add(v.in), true))).slice(0, 3);

  return {
    trait,
    carry,
    ...acc.stats(),
    playRate: round(n / Math.max(1, totalBoards), 4),
    tier: tierFor(acc, config.shrinkGames, config.cuts.comps),
    units: [...main]
      .sort((a, b) => data.cost(a) - data.cost(b) || (presence.get(b) ?? 0) - (presence.get(a) ?? 0) || a.localeCompare(b))
      .map((id) => ({ id, stars: mode(stars.get(id) ?? [1]) ?? 1 })),
    carries,
    avgLevel: round(avgLevel, 2),
    levelStyle,
    difficulty,
    variants: distinctVariants,
  };
}

/** Stable id of a comp: main trait + main carry, e.g. `rapidfire-sentinel`. */
export function compId(trait: string, carry: string, data: SetData, taken: Set<string>): string {
  const base = [slug(trait), data.champions.get(carry)?.slug ?? slug(carry)].filter(Boolean).join('-') || 'comp';
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
  taken.add(id);
  return id;
}
