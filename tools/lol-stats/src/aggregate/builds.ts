import type { ParticipantRecord } from '../extract/game.ts';
import type { ExclusiveGroups } from '../extract/items.ts';
import { rate, round, wilsonLower } from './stats.ts';

/** Main items of a participant in real purchase order: completed majors and tier-2 boots, merged by purchase time. */
export function mainItems(p: Pick<ParticipantRecord, 'majors' | 'boots'>): number[] {
  const timed: Array<readonly [number, number]> = [...p.majors];
  if (p.boots) timed.push(p.boots);
  return timed
    .map((entry, i) => ({ id: entry[0], t: entry[1], i }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((e) => e.id);
}

/** Purchase times of the main items (same order as `mainItems`). */
export function mainTimes(p: Pick<ParticipantRecord, 'majors' | 'boots'>): Map<number, number> {
  const times = new Map<number, number>(p.majors.map(([id, t]) => [id, t]));
  if (p.boots && !times.has(p.boots[0])) times.set(p.boots[0], p.boots[1]);
  return times;
}

/**
 * Build key: the first three main items (boots included), order-independent, plus the keystone and the
 * secondary tree. Same three items with another rune page = another build. Null under three main items.
 * Runes: [primaryStyle, keystone, p1, p2, p3, subStyle, …].
 */
export function buildKey(p: Pick<ParticipantRecord, 'majors' | 'boots' | 'runes'>): string | null {
  const items = mainItems(p);
  if (items.length < 3) return null;
  const trio = items.slice(0, 3).sort((a, b) => a - b).join('-');
  return `${trio}|${p.runes[1] ?? 0}-${p.runes[5] ?? 0}`;
}

export interface BuildCandidate {
  key: string;
  games: number;
  wins: number;
  /** Purchase orders seen for this key ("a-b-c" → games). */
  orders: Map<string, number>;
}

export const BUILD_LABELS = ['most_played', 'second_most_played', 'third_most_played', 'off_meta'] as const;
export type BuildLabel = (typeof BUILD_LABELS)[number];

export interface SelectedBuild extends BuildCandidate {
  label: BuildLabel;
  /** Most frequent purchase order of the three items. */
  core: number[];
  keystone: number;
  subStyle: number;
}

export interface BuildRules {
  /** Most played builds need max(minBuildGames, minBuildShare × games of the champion in the role). */
  minBuildGames: number;
  minBuildShare: number;
  /** OFF-META: share of the champion's games in [offMetaMinShare, offMetaMaxShare] and at least offMetaMinGames. */
  offMetaMinShare: number;
  offMetaMaxShare: number;
  offMetaMinGames: number;
}

function mostFrequentOrder(candidate: BuildCandidate): number[] {
  let best = '';
  let bestCount = -1;
  for (const [order, count] of candidate.orders) {
    if (count > bestCount || (count === bestCount && order < best)) {
      best = order;
      bestCount = count;
    }
  }
  return (best || candidate.key.split('|')[0]!).split('-').map(Number);
}

function select(candidate: BuildCandidate, label: BuildLabel): SelectedBuild {
  const [keystone, subStyle] = candidate.key.split('|')[1]!.split('-').map(Number) as [number, number];
  return { ...candidate, label, core: mostFrequentOrder(candidate), keystone, subStyle };
}

/**
 * Up to four builds:
 *  1-3. the three keys with the most games above max(minBuildGames, minBuildShare × champion games);
 *  4.   OFF-META: among the other keys with a share in [offMetaMinShare, offMetaMaxShare] and at least
 *       offMetaMinGames, whose win rate beats the champion's, the highest 95 % Wilson lower bound. None otherwise,
 *       and never without a most played build.
 */
export function selectBuilds(candidates: readonly BuildCandidate[], championRole: { games: number; wins: number }, rules: BuildRules): SelectedBuild[] {
  const threshold = Math.max(rules.minBuildGames, rules.minBuildShare * championRole.games);
  const byGames = [...candidates].sort((a, b) => b.games - a.games || a.key.localeCompare(b.key));
  const top = byGames.filter((c) => c.games >= threshold).slice(0, 3);
  const selected = top.map((c, i) => select(c, BUILD_LABELS[i]!));

  if (!top.length) return [];
  const average = rate(championRole.wins, championRole.games);
  const offMeta = byGames
    .filter((c) => !top.includes(c))
    .filter((c) => {
      const share = rate(c.games, championRole.games);
      return c.games >= rules.offMetaMinGames && share >= rules.offMetaMinShare && share <= rules.offMetaMaxShare && rate(c.wins, c.games) > average;
    })
    .sort((a, b) => wilsonLower(b.wins, b.games) - wilsonLower(a.wins, a.games) || b.games - a.games)[0];
  if (offMeta) selected.push(select(offMeta, 'off_meta'));
  return selected;
}

// ---------- Items 4 to 6 ----------

export interface WinCount {
  games: number;
  wins: number;
}

export interface SlotRules {
  /** An alternative needs at least this share of the build's games at its slot. */
  altMinShare: number;
  /** An item bought 6th in more than this share of its slot 4-6 purchases is not proposed 4th. */
  lateShare: number;
}

export interface SlotItem extends WinCount {
  item: number;
  winRate: number;
  /** Share of the build's games where the item is bought at this slot. */
  share: number;
}

export interface NextSlot extends SlotItem {
  slot: 4 | 5 | 6;
  alternatives: SlotItem[];
}

const conflicts = (a: number, b: number, groups: ExclusiveGroups): boolean => {
  if (a === b) return true;
  const ga = groups.get(a);
  const gb = groups.get(b);
  return !!ga && !!gb && ga.some((g) => gb.includes(g));
};

/**
 * Items 4, 5 and 6 of a build, without any duplicate:
 * - slot N takes the item most bought at purchase position N, excluding every item already retained
 *   (core and earlier slots) and any item exclusive with them (one pair of boots, one Tear item…);
 * - an item bought 6th in more than `lateShare` of its 4th-6th purchases is not proposed 4th;
 * - each slot gets at most 2 alternatives (the next most bought at that slot, at least `altMinShare` of the
 *   build's games), never already shown anywhere and never exclusive with the rest of the build.
 */
export function nextSlots(core: readonly number[], slots: readonly Map<number, WinCount>[], buildGames: number, groups: ExclusiveGroups, rules: SlotRules): NextSlot[] {
  const late = new Set<number>();
  const at = (s: number, item: number) => slots[s]?.get(item)?.games ?? 0;
  for (const item of new Set(slots.flatMap((s) => [...s.keys()]))) {
    const total = at(0, item) + at(1, item) + at(2, item);
    if (total > 0 && at(2, item) / total > rules.lateShare) late.add(item);
  }
  const ranked = (s: number) => [...(slots[s] ?? new Map<number, WinCount>()).entries()].sort((a, b) => b[1].games - a[1].games || a[0] - b[0]);
  const line = (item: number, c: WinCount): SlotItem => ({ item, games: c.games, wins: c.wins, winRate: round(rate(c.wins, c.games)), share: round(rate(c.games, buildGames)) });

  const shown: number[] = [...core];
  const mains: Array<SlotItem | null> = [];
  for (let s = 0; s < 3; s++) {
    const pick = ranked(s).find(([item]) => !(s === 0 && late.has(item)) && !shown.some((x) => conflicts(x, item, groups)));
    mains.push(pick ? line(pick[0], pick[1]) : null);
    if (pick) shown.push(pick[0]);
  }

  const result: NextSlot[] = [];
  const altsOf: number[][] = [[], [], []];
  for (let s = 0; s < 3; s++) {
    const main = mains[s];
    if (!main) continue;
    // Items an alternative must not repeat or clash with: everything shown except this slot's own main item.
    const others = () => [...core, ...mains.flatMap((m, i) => (m && i !== s ? [m.item] : [])), ...altsOf.flatMap((a, i) => (i !== s ? a : []))];
    const alternatives: SlotItem[] = [];
    for (const [item, c] of ranked(s)) {
      if (alternatives.length === 2) break;
      if (item === main.item || rate(c.games, buildGames) < rules.altMinShare || (s === 0 && late.has(item))) continue;
      if (altsOf.some((a) => a.includes(item)) || others().some((x) => conflicts(x, item, groups))) continue;
      alternatives.push(line(item, c));
      altsOf[s]!.push(item);
    }
    result.push({ slot: (s + 4) as 4 | 5 | 6, ...main, alternatives });
  }
  return result;
}
