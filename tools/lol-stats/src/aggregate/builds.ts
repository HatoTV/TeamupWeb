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
  /** An alternative needs at least this share of the purchases made at its slot... */
  altMinShare: number;
  /** ...and at least this many games. */
  altMinGames: number;
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
  /** Position in the six-item line (3 only for an ADC whose core holds the boots). */
  slot: 3 | 4 | 5 | 6;
  alternatives: SlotItem[];
}

const conflicts = (a: number, b: number, groups: ExclusiveGroups): boolean => {
  if (a === b) return true;
  const ga = groups.get(a);
  const gb = groups.get(b);
  return !!ga && !!gb && ga.some((g) => gb.includes(g));
};

/**
 * Items 4, 5 and 6 of a build (`count` slots, the last one being item 6: an ADC whose core holds the boots
 * gets 4 slots, items 3 to 6 of a line without boots):
 * - slot N takes the item most bought at purchase position N, excluding every item already retained
 *   (core and earlier slots) and any item exclusive with them (one pair of boots, one Tear item…):
 *   the main line has no duplicate;
 * - an item bought 6th in more than `lateShare` of its slot purchases is not proposed at the first slot;
 * - each slot gets at most 2 alternatives: the next most bought at that slot, at least `altMinShare` of the
 *   purchases made at that slot (fewer games reach the 6th item than the 4th) and `altMinGames` games, never
 *   a core item nor an item exclusive with the core. An alternative may be shown at another slot too.
 */
export function nextSlots(core: readonly number[], allSlots: readonly Map<number, WinCount>[], buildGames: number, groups: ExclusiveGroups, rules: SlotRules, count = 3): NextSlot[] {
  const slots = allSlots.slice(0, count);
  const late = new Set<number>();
  const at = (s: number, item: number) => slots[s]?.get(item)?.games ?? 0;
  for (const item of new Set(slots.flatMap((s) => [...s.keys()]))) {
    const total = slots.reduce((sum, _, s) => sum + at(s, item), 0);
    if (total > 0 && at(count - 1, item) / total > rules.lateShare) late.add(item);
  }
  const ranked = (s: number) => [...(slots[s] ?? new Map<number, WinCount>()).entries()].sort((a, b) => b[1].games - a[1].games || a[0] - b[0]);
  const line = (item: number, c: WinCount): SlotItem => ({ item, games: c.games, wins: c.wins, winRate: round(rate(c.wins, c.games)), share: round(rate(c.games, buildGames)) });

  const shown: number[] = [...core];
  const mains: Array<SlotItem | null> = [];
  for (let s = 0; s < count; s++) {
    const pick = ranked(s).find(([item]) => !(s === 0 && late.has(item)) && !shown.some((x) => conflicts(x, item, groups)));
    mains.push(pick ? line(pick[0], pick[1]) : null);
    if (pick) shown.push(pick[0]);
  }

  // Alternatives: the other items most bought at that slot. They may repeat an item shown at another slot
  // (Rabadon often bought 4th or 5th), never the core nor an item exclusive with it.
  const result: NextSlot[] = [];
  mains.forEach((main, s) => {
    if (!main) return;
    const total = [...slots[s]!.values()].reduce((sum, c) => sum + c.games, 0);
    const alternatives = ranked(s)
      .filter(
        ([item, c]) =>
          item !== main.item &&
          c.games >= rules.altMinGames &&
          rate(c.games, total) >= rules.altMinShare &&
          !(s === 0 && late.has(item)) &&
          !core.some((x) => conflicts(x, item, groups))
      )
      .slice(0, 2)
      .map(([item, c]) => line(item, c));
    result.push({ slot: (7 - count + s) as NextSlot['slot'], ...main, alternatives });
  });
  return result;
}
