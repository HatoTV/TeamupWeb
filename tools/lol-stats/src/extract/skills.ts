import type { TimelineEventDto } from '../riot/api.ts';

/** Ability slots as Riot numbers them: 1 = Q, 2 = W, 3 = E, 4 = R. */
export type Slot = 1 | 2 | 3 | 4;

/**
 * Skill order of a participant: slot of each NORMAL level-up (levels 1 to 18), as a compact string
 * such as "131213…". EVOLVE level-ups (Kha'Zix, Viktor…) are ignored.
 */
export function skillOrder(events: readonly TimelineEventDto[], participantId: number): string {
  let order = '';
  for (const e of events) {
    if (e.type !== 'SKILL_LEVEL_UP' || e.participantId !== participantId) continue;
    const { skillSlot, levelUpType } = e as { skillSlot: number; levelUpType: string };
    if (levelUpType !== 'NORMAL' || skillSlot < 1 || skillSlot > 4) continue;
    order += String(skillSlot);
    if (order.length === 18) break;
  }
  return order;
}

/**
 * Max order of the basic abilities: the order in which Q, W and E reach rank 5.
 * Abilities that never reach rank 5 come after, by points spent, then by slot.
 * "131213…" → "132" means Q first, then E, then W.
 */
export function maxOrder(order: string): string {
  const points = new Map<string, number>([
    ['1', 0],
    ['2', 0],
    ['3', 0],
  ]);
  const maxed: string[] = [];
  for (const slot of order) {
    if (!points.has(slot)) continue;
    const p = points.get(slot)! + 1;
    points.set(slot, p);
    if (p === 5) maxed.push(slot);
  }
  const rest = ['1', '2', '3'].filter((s) => !maxed.includes(s)).sort((a, b) => points.get(b)! - points.get(a)! || Number(a) - Number(b));
  return [...maxed, ...rest].join('');
}
