import type { TimelineEventDto } from '../riot/api.ts';
import type { ItemCatalog } from './items.ts';

export interface Purchase {
  itemId: number;
  /** Milliseconds since game start. */
  t: number;
  sold?: boolean;
}

/** Starting items are bought before 1:30. */
export const START_WINDOW_MS = 90_000;
/** Purchases closer than this belong to the same shopping session. */
export const SESSION_GAP_MS = 20_000;

/**
 * Net purchase order of one participant from timeline events:
 * - ITEM_PURCHASED adds an item;
 * - ITEM_UNDO with `beforeId` (afterId 0) cancels the last purchase of that item;
 * - ITEM_UNDO with `afterId` (beforeId 0) cancels a sale: the item is owned again;
 * - ITEM_SOLD marks the last owned copy as sold (the purchase still happened);
 * - ITEM_DESTROYED (components used in a recipe, potions drunk) does not change the purchase order.
 * Events must be in chronological order.
 */
export function purchaseOrder(events: readonly TimelineEventDto[], participantId: number): Purchase[] {
  const purchases: Purchase[] = [];
  for (const e of events) {
    if (e.participantId !== participantId) continue;
    switch (e.type) {
      case 'ITEM_PURCHASED':
        purchases.push({ itemId: (e as { itemId: number }).itemId, t: e.timestamp });
        break;
      case 'ITEM_UNDO': {
        const { beforeId, afterId } = e as { beforeId: number; afterId: number };
        if (beforeId && !afterId) {
          for (let i = purchases.length - 1; i >= 0; i--) {
            if (purchases[i]!.itemId === beforeId && !purchases[i]!.sold) {
              purchases.splice(i, 1);
              break;
            }
          }
        } else if (afterId && !beforeId) {
          for (let i = purchases.length - 1; i >= 0; i--) {
            if (purchases[i]!.itemId === afterId && purchases[i]!.sold) {
              delete purchases[i]!.sold;
              break;
            }
          }
        }
        break;
      }
      case 'ITEM_SOLD': {
        const itemId = (e as { itemId: number }).itemId;
        for (let i = purchases.length - 1; i >= 0; i--) {
          if (purchases[i]!.itemId === itemId && !purchases[i]!.sold) {
            purchases[i]!.sold = true;
            break;
          }
        }
        break;
      }
    }
  }
  return purchases;
}

export interface ItemPhases {
  /** Items bought before 1:30 (multiset, purchase order). */
  start: number[];
  /** Items of the first shopping session after 1:30, before the first major item. */
  firstBuy: number[];
  /** Time of the first back (ms), or null. */
  firstBuyT: number | null;
  /** Completed major items in purchase order (boots excluded), with their time. */
  majors: Array<[itemId: number, t: number]>;
  /** First tier-2 boots and when they were bought, or null. */
  boots: [itemId: number, t: number] | null;
  /** First six completed items, boots included, in purchase order. */
  fullBuild: number[];
}

export function itemPhases(purchases: readonly Purchase[], catalog: ItemCatalog): ItemPhases {
  const start = purchases.filter((p) => p.t < START_WINDOW_MS).map((p) => p.itemId);

  const majors: Array<[number, number]> = [];
  const fullBuild: number[] = [];
  let boots: [number, number] | null = null;
  const seenMajor = new Set<number>();
  for (const p of purchases) {
    if (catalog.isMajor(p.itemId) && !seenMajor.has(p.itemId)) {
      seenMajor.add(p.itemId);
      majors.push([p.itemId, p.t]);
      if (fullBuild.length < 6) fullBuild.push(p.itemId);
    } else if (!boots && catalog.bootsTier(p.itemId) >= 2) {
      const tier2 = catalog.tier2Boots(p.itemId);
      if (tier2) {
        boots = [tier2, p.t];
        if (fullBuild.length < 6) fullBuild.push(tier2);
      }
    }
  }

  const firstMajorT = majors[0]?.[1] ?? Infinity;
  const after = purchases.filter((p) => p.t >= START_WINDOW_MS && p.t < firstMajorT);
  const firstBuy: number[] = [];
  let previous: number | null = null;
  for (const p of after) {
    if (previous !== null && p.t - previous > SESSION_GAP_MS) break;
    firstBuy.push(p.itemId);
    previous = p.t;
  }
  const firstBuyT = after.length ? after[0]!.t : null;

  return { start, firstBuy, firstBuyT, majors, boots, fullBuild };
}

/** Build key: the first three major items (boots excluded), order-independent. */
export function buildKey(majors: ReadonlyArray<readonly [number, number]>): string | null {
  if (majors.length < 3) return null;
  return majors
    .slice(0, 3)
    .map(([id]) => id)
    .sort((a, b) => a - b)
    .join('-');
}
