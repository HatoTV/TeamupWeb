import type { ChampionItemStat, ItemHolder, TftChampionStats, TftItemStats } from '../../../../src/app/tft/logic/tft-types.ts';
import type { Config } from '../config.ts';
import type { Board } from './boards.ts';
import { Acc, adjustedAvg, round, tierFor, upsert } from './stats.ts';

type UnitConfig = Pick<Config, 'minItemGames' | 'minHolderGames' | 'minTrioGames' | 'shrinkGames' | 'cuts'>;

/**
 * Champion and item statistics of a set of boards (one rank filter).
 * - champion: boards where it is played (copies count once);
 * - item: boards where at least one unit holds it;
 * - item × champion (« holders », « best items alone »): units of the champion holding the item; `delta` = average
 *   placement of the champion with the item minus without it;
 * - trios: units holding exactly three items, the three together.
 */
export function unitStats(boards: readonly Board[], config: UnitConfig): { champions: TftChampionStats[]; items: TftItemStats[] } {
  const total = boards.length;
  const champion = new Map<string, Acc>();
  const championUnits = new Map<string, Acc>();
  const item = new Map<string, Acc>();
  const holding = new Map<string, Map<string, Acc>>(); // champion → item → units holding it
  const trios = new Map<string, Map<string, Acc>>(); // champion → sorted items → units

  for (const b of boards) {
    for (const c of b.champions) upsert(champion, c, () => new Acc()).add(b.placement);
    const boardItems = new Set<string>();
    for (const u of b.units) {
      upsert(championUnits, u.id, () => new Acc()).add(b.placement);
      const held = new Set(u.items);
      for (const i of held) {
        boardItems.add(i);
        upsert(upsert(holding, u.id, () => new Map()), i, () => new Acc()).add(b.placement);
      }
      if (u.items.length === 3) upsert(upsert(trios, u.id, () => new Map()), [...u.items].sort().join('|'), () => new Acc()).add(b.placement);
    }
    for (const i of boardItems) upsert(item, i, () => new Acc()).add(b.placement);
  }

  const shrink = config.shrinkGames;
  const byAdjusted = <T extends { acc: Acc }>(a: T, b: T) => adjustedAvg(a.acc, shrink) - adjustedAvg(b.acc, shrink) || b.acc.n - a.acc.n;
  const delta = (all: Acc | undefined, withItem: Acc) => {
    const without = all?.avgWithout(withItem);
    return without === null || without === undefined ? 0 : round(withItem.avg - without, 3);
  };

  const holders = new Map<string, Array<ItemHolder & { acc: Acc }>>();
  const champions: TftChampionStats[] = [...champion]
    .map(([id, acc]) => {
      const units = championUnits.get(id);
      const items: Array<ChampionItemStat & { acc: Acc }> = [];
      for (const [itemId, a] of holding.get(id) ?? []) {
        if (a.n < config.minHolderGames) continue;
        const d = delta(units, a);
        const tier = tierFor(a, shrink, config.cuts.compat);
        items.push({ item: itemId, ...a.stats(), share: round(a.n / Math.max(1, units?.n ?? 1), 4), delta: d, tier, acc: a });
        upsert(holders, itemId, () => []).push({ champion: id, ...a.stats(), delta: d, tier, acc: a });
      }
      const best = [...(trios.get(id) ?? [])]
        .filter(([, a]) => a.n >= config.minTrioGames)
        .map(([key, a]) => ({ items: key.split('|'), acc: a }))
        .sort(byAdjusted)
        .slice(0, 8)
        .map(({ items: list, acc: a }) => ({ items: list, ...a.stats(), tier: tierFor(a, shrink, config.cuts.compat) }));
      return {
        id,
        ...acc.stats(),
        playRate: round(acc.n / Math.max(1, total), 4),
        tier: tierFor(acc, shrink, config.cuts.champions),
        items: items.sort(byAdjusted).slice(0, 12).map(({ acc: _, ...rest }) => rest),
        trios: best,
      };
    })
    .sort((a, b) => a.avg - b.avg);

  const items: TftItemStats[] = [...item]
    .filter(([, acc]) => acc.n >= config.minItemGames)
    .map(([id, acc]) => ({
      id,
      ...acc.stats(),
      playRate: round(acc.n / Math.max(1, total), 4),
      tier: tierFor(acc, shrink, config.cuts.items),
      holders: (holders.get(id) ?? []).sort(byAdjusted).map(({ acc: _, ...rest }) => rest),
    }))
    .sort((a, b) => a.avg - b.avg);

  return { champions, items };
}
