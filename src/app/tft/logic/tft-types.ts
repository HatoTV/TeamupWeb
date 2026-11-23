// Types of the TFT data files. Types only (no runtime code): also imported by tools/tft-stats.

/** Synergy tier of a breakpoint. `unique`: one-unit trait. */
export type TraitStyle = 'bronze' | 'silver' | 'gold' | 'prismatic' | 'unique';
export type TftItemKind = 'component' | 'complete' | 'emblem' | 'radiant' | 'artifact';
export type TftTier = 'S' | 'A' | 'B' | 'C';

/** `data/tft/static/set{N}/{lang}.json` (tools/tft-static). */
export interface TftChampion {
  /** Riot id (`character_id` in the match data), e.g. `DA_18_Hecarim`. */
  id: string;
  /** 4 characters, team builder links. */
  short: string;
  slug: string;
  name: string;
  cost: number;
  /** Trait ids. */
  traits: string[];
  /** Form of another champion (`Lux (Fae)` → `Lux`): hidden from the lists, counted with it. */
  variantOf?: string;
  icon: string | null;
  ability: { name: string; desc: string; hasValues: boolean };
  stats: {
    hp: number | null;
    damage: number | null;
    armor: number | null;
    magicResist: number | null;
    attackSpeed: number | null;
    range: number | null;
    mana: number | null;
    initialMana: number | null;
  };
}

export interface TftTrait {
  id: string;
  name: string;
  icon: string | null;
  /** Units needed for each tier, ascending. */
  breakpoints: Array<{ min: number; style: TraitStyle }>;
}

export interface TftItem {
  id: string;
  short: string;
  slug: string;
  name: string;
  kind: TftItemKind;
  icon: string | null;
  /** Two components (complete items and emblems). */
  recipe?: string[];
  /** Trait given by an emblem. */
  trait?: string;
  /** Other ids of the same item in the match data. */
  aliases?: string[];
}

export interface TftStatic {
  set: number;
  mutator: string;
  version: string;
  generatedAt: string;
  champions: TftChampion[];
  traits: TftTrait[];
  items: TftItem[];
}

// ---------- statistics (tools/tft-stats) ----------

export type TftQueue = 'ranked' | 'double_up';
export type TftRankFilter = 'platinum_plus' | 'emerald_plus' | 'diamond_plus' | 'master_plus';

/** Placement statistics of a group of boards. `avg`: average placement (1 = first); rates 0 to 1. */
export interface PlacementStats {
  games: number;
  avg: number;
  top4: number;
  win: number;
}

export interface CompItemStat {
  item: string;
  /** Share of the comp's games where the carry holds the item. */
  share: number;
  /** Average placement when the carry holds it. */
  avg: number;
}

export type LevelStyle = { kind: 'reroll'; level: number } | { kind: 'fast8' | 'fast9'; level: number } | { kind: 'level'; level: number };

export interface TftComp extends PlacementStats {
  /** Stable id (`?comp=`, overrides). */
  id: string;
  /** Main trait and main carry: the name of the comp. */
  trait: string;
  carry: string;
  playRate: number;
  tier: TftTier;
  /** Main version, by cost; `stars`: most frequent star level. */
  units: Array<{ id: string; stars: number }>;
  /** The three units that most often hold three items, with their items in this comp. */
  carries: Array<{ unit: string; items: CompItemStat[]; alternatives: CompItemStat[] }>;
  avgLevel: number;
  levelStyle: LevelStyle;
  /** 1 easy, 2 medium, 3 hard (computed, see tools/tft-stats/README.md). */
  difficulty: 1 | 2 | 3;
  /** « Replace X with Y at level N ». */
  variants: Array<{ out: string; in: string; level: number; games: number; avg: number }>;
}

export interface ChampionItemStat extends PlacementStats {
  item: string;
  /** Share of the champion's games with this item. */
  share: number;
  /** Average placement with the item minus without it (negative = better). */
  delta: number;
  tier: TftTier;
}

export interface TftChampionStats extends PlacementStats {
  id: string;
  playRate: number;
  tier: TftTier;
  items: ChampionItemStat[];
  /** Best sets of three items held together. */
  trios: Array<PlacementStats & { items: string[]; tier: TftTier }>;
}

export interface ItemHolder extends PlacementStats {
  champion: string;
  delta: number;
  tier: TftTier;
}

export interface TftItemStats extends PlacementStats {
  id: string;
  playRate: number;
  tier: TftTier;
  /** Every champion above the threshold, best compatibility first. */
  holders: ItemHolder[];
}

/** `data/tft/stats/{patch}/{queue}/{filter}.json`. */
export interface TftStatsFile {
  set: number;
  patch: string;
  queue: TftQueue;
  filter: TftRankFilter;
  generatedAt: string;
  /** Matches and boards (8 per match) analysed. */
  matches: number;
  boards: number;
  minCompGames: number;
  sample?: boolean;
  comps: TftComp[];
  champions: TftChampionStats[];
  items: TftItemStats[];
}

/** `data/tft/stats/meta.json`. */
export interface TftStatsMeta {
  set: number;
  latest: string;
  patches: Array<{ patch: string; updatedAt: string; releasedAt?: string; matches: Record<string, number> }>;
  queues: TftQueue[];
  filters: TftRankFilter[];
  sample?: boolean;
}

/** `data/tft/tft-comps-overrides.json`: editorial content, by comp id. */
export interface TftCompOverride {
  /** Cell (0-27, row × 7 + column, row 0 = front line) of each unit id. */
  placement?: Record<string, number>;
  /** Levelling plan, e.g. [{ level: 4, stage: '2-1' }]. */
  levelling?: Array<{ level: number; stage: string }>;
  /** Units of the early game. */
  early?: string[];
  difficulty?: 1 | 2 | 3;
  notes?: { fr?: string; en?: string };
}
