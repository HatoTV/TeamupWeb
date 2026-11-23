import type { TftComp, TftQueue, TftRankFilter, TftStatsFile } from '../../../../src/app/tft/logic/tft-types.ts';
import { RANK_FILTERS, type Config } from '../config.ts';
import type { BoardRecord } from '../extract.ts';
import type { SetData } from '../static.ts';
import { toBoard, type Board } from './boards.ts';
import { clusterBoards, compId, describeComp } from './comps.ts';
import { unitStats } from './units.ts';

/**
 * Statistics files of one patch and one queue, one per rank filter. Comps are clustered once on every board of the
 * queue (same comps and ids in every filter), then described and counted in each filter; a comp is shown in a filter
 * when it has at least `minCompGames` boards there.
 */
export function aggregateQueue(records: Iterable<BoardRecord>, patch: string, queue: TftQueue, data: SetData, config: Config, generatedAt = new Date().toISOString()): TftStatsFile[] {
  const boards: Board[] = [];
  const matches = new Map<TftRankFilter, Set<string>>(RANK_FILTERS.map((f) => [f, new Set()]));
  for (const r of records) {
    if (r.p !== patch || r.q !== queue) continue;
    const b = toBoard(r, data);
    boards.push(b);
    for (const f of b.filters) matches.get(f)!.add(r.m);
  }

  const clusters = clusterBoards(boards, data, config);
  const taken = new Set<string>();
  const named = clusters.map((members) => {
    const all = describeComp(members, boards.length, data, { ...config, minCompGames: 1 });
    return { members, id: all ? compId(all.trait, all.carry, data, taken) : '' };
  });

  return RANK_FILTERS.map((filter) => {
    const inFilter = boards.filter((b) => b.filters.includes(filter));
    const comps: TftComp[] = [];
    for (const { members, id } of named) {
      if (!id) continue;
      const described = describeComp(
        members.filter((b) => b.filters.includes(filter)),
        inFilter.length,
        data,
        config
      );
      if (described) comps.push({ id, ...described });
    }
    comps.sort((a, b) => 'SABC'.indexOf(a.tier) - 'SABC'.indexOf(b.tier) || a.avg - b.avg);
    const { champions, items } = unitStats(inFilter, config);
    return {
      set: data.set,
      patch,
      queue,
      filter,
      generatedAt,
      matches: matches.get(filter)!.size,
      boards: inFilter.length,
      minCompGames: config.minCompGames,
      comps,
      champions,
      items,
    };
  });
}
