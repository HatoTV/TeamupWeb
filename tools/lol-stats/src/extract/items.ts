import type { DDragonItem } from '../ddragon.ts';

/** Items of Summoner's Rift classified once per patch from Data Dragon `item.json`. */
export interface ItemCatalog {
  isMajor(id: number): boolean;
  /** 0 = not boots, 1 = basic Boots, 2 = tier-2 boots, 3 = tier-3 upgrade. */
  bootsTier(id: number): 0 | 1 | 2 | 3;
  /** Tier-2 boots an item comes from (itself for tier 2), or null. */
  tier2Boots(id: number): number | null;
  isStarterOrConsumable(id: number): boolean;
  has(id: number): boolean;
}

const BOOTS = '1001';
/** Completed items cheaper than this are starter / quest items (Doran's, Cull, support quest, pets…). */
export const MIN_MAJOR_GOLD = 1500;

type ItemData = Record<string, Pick<DDragonItem, 'gold' | 'maps' | 'from' | 'into' | 'tags' | 'consumed' | 'inStore' | 'requiredChampion' | 'requiredAlly'>>;

export function buildItemCatalog(data: ItemData): ItemCatalog {
  const onRift = (id: string): boolean => {
    const item = data[id];
    return !!item && !!item.maps?.['11'] && item.gold.purchasable && item.inStore !== false && !item.requiredChampion && !item.requiredAlly && id.length <= 4;
  };

  const tierCache = new Map<string, 0 | 1 | 2 | 3>();
  const bootsTier = (id: string): 0 | 1 | 2 | 3 => {
    if (tierCache.has(id)) return tierCache.get(id)!;
    let tier: 0 | 1 | 2 | 3 = 0;
    if (id === BOOTS) tier = 1;
    else {
      const from = data[id]?.from ?? [];
      if (from.includes(BOOTS)) tier = 2;
      else if (from.some((f) => bootsTier(f) === 2)) tier = 3;
    }
    tierCache.set(id, tier);
    return tier;
  };

  const consumable = (id: string): boolean => {
    const item = data[id];
    return !!item && (!!item.consumed || (item.tags ?? []).some((t) => t === 'Consumable' || t === 'Trinket'));
  };

  const completed = (id: string): boolean => !(data[id]?.into ?? []).some(onRift);

  const majors = new Set<number>();
  for (const id of Object.keys(data)) {
    if (!onRift(id) || bootsTier(id) > 0 || consumable(id) || !completed(id)) continue;
    if (data[id]!.gold.total >= MIN_MAJOR_GOLD) majors.add(Number(id));
  }

  return {
    isMajor: (id) => majors.has(id),
    bootsTier: (id) => bootsTier(String(id)),
    tier2Boots: (id) => {
      const key = String(id);
      const tier = bootsTier(key);
      if (tier === 2) return id;
      if (tier === 3) {
        const from = (data[key]?.from ?? []).find((f) => bootsTier(f) === 2);
        return from ? Number(from) : null;
      }
      return null;
    },
    isStarterOrConsumable: (id) => {
      const key = String(id);
      return consumable(key) || (onRift(key) && completed(key) && bootsTier(key) === 0 && (data[key]?.gold.total ?? 0) < MIN_MAJOR_GOLD);
    },
    has: (id) => String(id) in data,
  };
}
