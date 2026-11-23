// TFT board (4 rows × 7 hexes, row 0 = front line): placement rules and team builder links.
// No runtime import: also used by tools/tft-stats.
import type { TftChampion } from './tft-types';

export const ROWS = 4;
export const COLS = 7;
export const CELLS = ROWS * COLS;
export const MAX_ITEMS = 3;
export const MAX_STARS = 3;

export const cellOf = (row: number, col: number) => row * COLS + col;
export const rowOf = (cell: number) => Math.floor(cell / COLS);
export const colOf = (cell: number) => cell % COLS;

/** Columns from the centre outwards, and from the corners inwards. */
const CENTRE_OUT = [3, 2, 4, 1, 5, 0, 6];
const CORNERS_IN = [0, 6, 1, 5, 2, 4, 3];
const SIDES = [0, 6, 1, 5, 2, 4, 3];

export type PlacementRole = 'tank' | 'assassin' | 'carry' | 'backline';

/**
 * Traits whose melee units jump to the enemy back line (Set 18: Rival = Kha'Zix and Rengar). Assumption, editable;
 * comps can be corrected in data/tft/tft-comps-overrides.json.
 */
export const ASSASSIN_TRAITS: readonly string[] = ['DA_18_Rival'];

type ChampionShape = Pick<TftChampion, 'traits' | 'stats'>;

/**
 * Role on the board: melee units are front-liners (tanks), except assassins; ranged units with items are carries (back
 * corners), the others stay in the back line.
 */
export function placementRole(champion: ChampionShape, isCarry: boolean, assassinTraits: readonly string[] = ASSASSIN_TRAITS): PlacementRole {
  const range = champion.stats.range ?? 1;
  if (range <= 1) return champion.traits.some((t) => assassinTraits.includes(t)) ? 'assassin' : 'tank';
  return isCarry ? 'carry' : 'backline';
}

/** Cells in order of preference for a role. */
export function preferredCells(role: PlacementRole): number[] {
  switch (role) {
    case 'tank':
      return [...CENTRE_OUT.map((c) => cellOf(0, c)), ...CENTRE_OUT.map((c) => cellOf(1, c)), ...CENTRE_OUT.map((c) => cellOf(2, c)), ...CENTRE_OUT.map((c) => cellOf(3, c))];
    case 'assassin':
      return [...SIDES.map((c) => cellOf(3, c)), ...SIDES.map((c) => cellOf(2, c)), ...SIDES.map((c) => cellOf(0, c)), ...SIDES.map((c) => cellOf(1, c))];
    case 'carry':
      return [...CORNERS_IN.map((c) => cellOf(3, c)), ...CORNERS_IN.map((c) => cellOf(2, c)), ...CORNERS_IN.map((c) => cellOf(1, c)), ...CORNERS_IN.map((c) => cellOf(0, c))];
    case 'backline':
      return [...CENTRE_OUT.map((c) => cellOf(3, c)), ...CENTRE_OUT.map((c) => cellOf(2, c)), ...CENTRE_OUT.map((c) => cellOf(1, c)), ...CENTRE_OUT.map((c) => cellOf(0, c))];
  }
}

/** First free cell for a role, or -1 when the board is full. */
export function autoCell(role: PlacementRole, occupied: ReadonlySet<number>): number {
  return preferredCells(role).find((c) => !occupied.has(c)) ?? -1;
}

/**
 * Recommended placement of a comp (the API gives no positions): tanks in front from the centre, ranged carries in the
 * back corners, assassins on the back sides, the other ranged units in the back line. Carries are placed first.
 */
export function recommendedPlacement(
  units: ReadonlyArray<{ id: string; carry: boolean }>,
  champion: (id: string) => ChampionShape | undefined,
  assassinTraits: readonly string[] = ASSASSIN_TRAITS
): Map<string, number> {
  const out = new Map<string, number>();
  const occupied = new Set<number>();
  const ordered = [...units].sort((a, b) => Number(b.carry) - Number(a.carry));
  for (const u of ordered) {
    const c = champion(u.id);
    if (!c) continue;
    const cell = autoCell(placementRole(c, u.carry, assassinTraits), occupied);
    if (cell < 0) break;
    occupied.add(cell);
    out.set(u.id, cell);
  }
  return out;
}

// ---------- team builder links ----------

export interface PlacedUnit {
  champion: string;
  stars: number;
  cell: number;
  items: string[];
}

/**
 * Compact link of a board: units separated by `_`, each `{champion short id (4)}{stars (1)}{cell (1, base 36)}{item short
 * ids (4 each, 0 to 3)}`. Example: `b5m82r` = Aphelios 2 stars on cell 27, no item.
 */
export function encodeBoard(units: readonly PlacedUnit[], short: { champion(id: string): string | undefined; item(id: string): string | undefined }): string {
  return units
    .filter((u) => u.cell >= 0 && u.cell < CELLS)
    .sort((a, b) => a.cell - b.cell)
    .map((u) => {
      const c = short.champion(u.champion);
      if (!c) return '';
      const items = u.items.slice(0, MAX_ITEMS).map((i) => short.item(i) ?? '').filter(Boolean).join('');
      return `${c}${Math.min(MAX_STARS, Math.max(1, u.stars))}${u.cell.toString(36)}${items}`;
    })
    .filter(Boolean)
    .join('_');
}

/** Board of a link; unknown champions or items (older set, typo) are skipped, two units never share a cell. */
export function decodeBoard(code: string | null | undefined, ids: { champion(short: string): string | undefined; item(short: string): string | undefined }): PlacedUnit[] {
  if (!code) return [];
  const out: PlacedUnit[] = [];
  const used = new Set<number>();
  for (const token of code.split('_')) {
    const m = /^([0-9a-z]{4})([1-3])([0-9a-r])((?:[0-9a-z]{4}){0,3})$/.exec(token);
    if (!m) continue;
    const champion = ids.champion(m[1]!);
    const cell = parseInt(m[3]!, 36);
    if (!champion || used.has(cell)) continue;
    used.add(cell);
    const items = (m[4]!.match(/.{4}/g) ?? []).map((s) => ids.item(s)).filter((i): i is string => !!i);
    out.push({ champion, stars: Number(m[2]), cell, items });
  }
  return out;
}

/** Gold value of a board: cost × 3^(stars − 1) per unit. */
export function boardCost(units: ReadonlyArray<{ cost: number; stars: number }>): number {
  return units.reduce((sum, u) => sum + u.cost * 3 ** (u.stars - 1), 0);
}
