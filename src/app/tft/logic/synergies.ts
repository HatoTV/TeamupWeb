// Trait counting of a TFT board (team builder, comps). No runtime import: also used by tools/tft-stats tests.
import type { TftChampion, TftItem, TftTrait, TraitStyle } from './tft-types';

export interface SynergyLookup {
  champion(id: string): Pick<TftChampion, 'id' | 'traits' | 'variantOf'> | undefined;
  trait(id: string): Pick<TftTrait, 'id' | 'breakpoints'> | undefined;
  item(id: string): Pick<TftItem, 'id' | 'kind' | 'trait'> | undefined;
}

export interface BoardUnit {
  champion: string;
  items?: readonly string[];
}

export interface Synergy {
  trait: string;
  count: number;
  /** Tier reached, null when below the first breakpoint. */
  style: TraitStyle | null;
  /** Index of the breakpoint reached (-1: none). */
  level: number;
  breakpoints: ReadonlyArray<{ min: number; style: TraitStyle }>;
}

const STYLE_RANK: Record<TraitStyle, number> = { prismatic: 5, gold: 4, unique: 3, silver: 2, bronze: 1 };

/**
 * Traits of a board. Each champion counts once (copies of the same champion do not add up, nor do its forms); an emblem
 * adds its trait to the champion holding it unless the champion already has it.
 * Sorted: active traits (best tier, then most units), then inactive ones (most units).
 */
export function computeSynergies(units: readonly BoardUnit[], data: SynergyLookup): Synergy[] {
  const traitsByChampion = new Map<string, Set<string>>();
  for (const unit of units) {
    const champion = data.champion(unit.champion);
    if (!champion) continue;
    const key = champion.variantOf ?? champion.id;
    let traits = traitsByChampion.get(key);
    if (!traits) traitsByChampion.set(key, (traits = new Set()));
    for (const t of champion.traits) traits.add(t);
    for (const itemId of unit.items ?? []) {
      const item = data.item(itemId);
      if (item?.kind === 'emblem' && item.trait) traits.add(item.trait);
    }
  }
  const counts = new Map<string, number>();
  for (const traits of traitsByChampion.values()) for (const t of traits) counts.set(t, (counts.get(t) ?? 0) + 1);

  const out: Synergy[] = [];
  for (const [id, count] of counts) {
    const trait = data.trait(id);
    if (!trait || !trait.breakpoints.length) continue;
    let level = -1;
    trait.breakpoints.forEach((b, i) => {
      if (count >= b.min) level = i;
    });
    out.push({ trait: id, count, level, style: level >= 0 ? trait.breakpoints[level]!.style : null, breakpoints: trait.breakpoints });
  }
  return out.sort((a, b) => {
    if (!!a.style !== !!b.style) return a.style ? -1 : 1;
    const rank = (a.style ? STYLE_RANK[b.style!] - STYLE_RANK[a.style] : 0) || b.count - a.count;
    return rank || a.trait.localeCompare(b.trait);
  });
}

/** Lookup over the static data arrays. */
export function synergyLookup(data: { champions: readonly TftChampion[]; traits: readonly TftTrait[]; items: readonly TftItem[] }): SynergyLookup {
  const champions = new Map(data.champions.map((c) => [c.id, c]));
  const traits = new Map(data.traits.map((t) => [t.id, t]));
  const items = new Map<string, TftItem>();
  for (const i of data.items) for (const id of [i.id, ...(i.aliases ?? [])]) items.set(id, i);
  return { champion: (id) => champions.get(id), trait: (id) => traits.get(id), item: (id) => items.get(id) };
}
