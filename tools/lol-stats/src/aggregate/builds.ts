import type { ParticipantRecord } from '../extract/game.ts';
import type { ExclusiveGroups } from '../extract/items.ts';
import { rate, round, wilsonLower } from './stats.ts';

/** Core of a participant: his first two completed major items (boots excluded), in purchase order. */
export function coreItems(p: Pick<ParticipantRecord, 'majors'>): number[] {
  return p.majors.slice(0, 2).map(([id]) => id);
}

/**
 * Build key: the first two completed major items (boots excluded), order-independent, plus the keystone and the
 * secondary tree. Other boots or other minor runes = same build; another core item, keystone or secondary tree =
 * another build. Null under two major items.
 * Runes: [primaryStyle, keystone, p1, p2, p3, subStyle, …].
 */
export function buildKey(p: Pick<ParticipantRecord, 'majors' | 'runes'>): string | null {
  const core = coreItems(p);
  if (core.length < 2) return null;
  return `${[...core].sort((a, b) => a - b).join('-')}|${p.runes[1] ?? 0}-${p.runes[5] ?? 0}`;
}

export interface BuildCandidate {
  key: string;
  games: number;
  wins: number;
  /** Purchase orders seen for this key ("a-b-c" → games). */
  orders: Map<string, number>;
}

export const BUILD_LABELS = ['most_played', 'best_win_rate', 'alternative', 'off_meta'] as const;
export type BuildLabel = (typeof BUILD_LABELS)[number];

export interface SelectedBuild extends BuildCandidate {
  label: BuildLabel;
  /** Most frequent purchase order of the two core items. */
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

const coreOf = (c: BuildCandidate) => c.key.split('|')[0]!.split('-').map(Number);
const keystoneOf = (c: BuildCandidate) => Number(c.key.split('|')[1]!.split('-')[0]);

/**
 * Up to four builds, each with its own key. "Reliable" = at least max(minBuildGames, minBuildShare × champion games).
 *  1. most played: the reliable key with the most games;
 *  2. best win rate: among the other reliable keys, the highest win rate;
 *  3. alternative: among the other reliable keys whose core differs from the most played one by one or two items,
 *     the most played;
 *  4. OFF-META: among the other keys with a share in [offMetaMinShare, offMetaMaxShare] and at least offMetaMinGames,
 *     whose win rate beats the champion's, without any core item nor the keystone of the most played build, the
 *     highest 95 % Wilson lower bound.
 * A slot without a qualifying key is left out; nothing without a most played build.
 */
export function selectBuilds(candidates: readonly BuildCandidate[], championRole: { games: number; wins: number }, rules: BuildRules): SelectedBuild[] {
  const threshold = Math.max(rules.minBuildGames, rules.minBuildShare * championRole.games);
  const byGames = [...candidates].sort((a, b) => b.games - a.games || a.key.localeCompare(b.key));
  const reliable = byGames.filter((c) => c.games >= threshold);
  const first = reliable[0];
  if (!first) return [];
  const taken = new Set<BuildCandidate>([first]);
  const selected = [select(first, 'most_played')];
  const take = (c: BuildCandidate | undefined, label: BuildLabel) => {
    if (!c) return;
    taken.add(c);
    selected.push(select(c, label));
  };

  take(
    reliable.filter((c) => !taken.has(c)).sort((a, b) => rate(b.wins, b.games) - rate(a.wins, a.games) || b.games - a.games)[0],
    'best_win_rate'
  );
  const firstCore = coreOf(first);
  take(
    reliable.find((c) => !taken.has(c) && coreOf(c).some((id) => !firstCore.includes(id))),
    'alternative'
  );
  const average = rate(championRole.wins, championRole.games);
  take(
    byGames
      .filter((c) => !taken.has(c) && keystoneOf(c) !== keystoneOf(first) && !coreOf(c).some((id) => firstCore.includes(id)))
      .filter((c) => {
        const share = rate(c.games, championRole.games);
        return c.games >= rules.offMetaMinGames && share >= rules.offMetaMinShare && share <= rules.offMetaMaxShare && rate(c.wins, c.games) > average;
      })
      .sort((a, b) => wilsonLower(b.wins, b.games) - wilsonLower(a.wins, a.games) || b.games - a.games)[0],
    'off_meta'
  );
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

export interface SlotWithAlternatives extends SlotItem {
  alternatives: SlotItem[];
}

export interface NextSlot extends SlotWithAlternatives {
  /** Position in the line of items without boots: 3 to 5, or 3 to 6 when the boots do not take an item slot. */
  slot: 3 | 4 | 5 | 6;
}

const conflicts = (a: number, b: number, groups: ExclusiveGroups): boolean => {
  if (a === b) return true;
  const ga = groups.get(a);
  const gb = groups.get(b);
  return !!ga && !!gb && ga.some((g) => gb.includes(g));
};

/**
 * Items after the two core items, boots excluded (`count` slots: 3 for items 3 to 5 when the boots take the sixth
 * slot, 4 for items 3 to 6 for an ADC, whose role quest frees a slot for the boots, or a build without boots):
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
    result.push({ slot: (3 + s) as NextSlot['slot'], ...main, alternatives });
  });
  return result;
}

/**
 * Boots of a build: the tier-2 boots most bought with it and at most 2 alternatives, each at least `altMinShare` of
 * the boots purchases and `altMinGames` games. Shares are shares of the build's games. Null when no boots are bought.
 */
export function bootsSlot(boots: ReadonlyMap<number, WinCount>, buildGames: number, rules: Pick<SlotRules, 'altMinShare' | 'altMinGames'>): SlotWithAlternatives | null {
  const ranked = [...boots.entries()].sort((a, b) => b[1].games - a[1].games || a[0] - b[0]);
  if (!ranked.length) return null;
  const total = ranked.reduce((sum, [, c]) => sum + c.games, 0);
  const line = ([item, c]: [number, WinCount]): SlotItem => ({ item, games: c.games, wins: c.wins, winRate: round(rate(c.wins, c.games)), share: round(rate(c.games, buildGames)) });
  const alternatives = ranked
    .slice(1)
    .filter(([, c]) => c.games >= rules.altMinGames && rate(c.games, total) >= rules.altMinShare)
    .slice(0, 2)
    .map(line);
  return { ...line(ranked[0]!), alternatives };
}
