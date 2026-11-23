import { readFileSync } from 'node:fs';
import type { TftChampion, TftItem, TftStatic, TftTrait } from '../../../src/app/tft/logic/tft-types.ts';
import { REPO_DIR } from './config.ts';

/** Static set data (tools/tft-static output) seen from the statistics: ids, costs, item kinds, aliases. */
export interface SetData {
  set: number;
  champions: Map<string, TftChampion>;
  traits: Map<string, TftTrait>;
  /** Item by id or alias. */
  items: Map<string, TftItem>;
  /** Champion id of the statistics (a form counts with its champion). */
  baseOf(id: string): string | null;
  /** Kept item id of an id or alias, null for items outside the catalogue (consumables, augment items…). */
  itemOf(id: string): string | null;
  /** Items that make a carry: completed items (complete, radiant, artifact), not components nor emblems. */
  isCompleted(id: string): boolean;
  cost(id: string): number;
}

export function setData(data: Pick<TftStatic, 'set' | 'champions' | 'traits' | 'items'>): SetData {
  const champions = new Map(data.champions.map((c) => [c.id, c]));
  const traits = new Map(data.traits.map((t) => [t.id, t]));
  const items = new Map<string, TftItem>();
  for (const i of data.items) for (const id of [i.id, ...(i.aliases ?? [])]) items.set(id, i);
  return {
    set: data.set,
    champions,
    traits,
    items,
    baseOf: (id) => {
      const c = champions.get(id);
      return c ? (c.variantOf ?? c.id) : null;
    },
    itemOf: (id) => items.get(id)?.id ?? null,
    isCompleted: (id) => {
      const k = items.get(id)?.kind;
      return k === 'complete' || k === 'radiant' || k === 'artifact';
    },
    cost: (id) => champions.get(id)?.cost ?? 1,
  };
}

export function loadSetData(set: number): SetData {
  const data = JSON.parse(readFileSync(`${REPO_DIR}public/data/tft/static/set${set}/en.json`, 'utf8')) as TftStatic;
  return setData(data);
}
