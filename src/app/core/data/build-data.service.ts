import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Lang } from '../site.config';
import { Role } from './champion-data.service';

/** JSON produced by tools/lol-stats (see tools/lol-stats/src/schema.ts). */
/** `*_plus` filters include every tier above (widest first); then single tiers (`challenger` is both). */
export const BUILD_FILTERS = ['emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster_plus', 'challenger', 'emerald', 'diamond', 'master', 'grandmaster'] as const;
/** Single-tier filters, shown in their own group. */
export const EXACT_FILTERS: readonly string[] = ['emerald', 'diamond', 'master', 'grandmaster'];
export type BuildFilter = (typeof BUILD_FILTERS)[number];
export type TierRank = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
/** `second_most_played` and `third_most_played`: files published before 2026-11-18. */
export type BuildLabel = 'most_played' | 'best_win_rate' | 'alternative' | 'off_meta' | 'second_most_played' | 'third_most_played';

export interface StatLine {
  games: number;
  wins: number;
  winRate: number;
}

/** Item bought at a slot (3rd to 6th item, or boots) and its share of the build games at that slot. */
export interface SlotItem extends StatLine {
  item: number;
  share: number;
}

export interface BuildData extends StatLine {
  label: BuildLabel;
  /** First two completed items (boots excluded) in purchase order. Files published before 2026-11-18: three main items, boots included. */
  core: number[];
  keystone: number;
  subStyle: number;
  share: number;
  runes: (StatLine & { page: number[] }) | null;
  spells: (StatLine & { ids: [number, number] }) | null;
  start: { items: number[]; games: number } | null;
  firstBuy: { items: number[]; games: number; medianMs: number | null } | null;
  /** Median purchase time of each core item. */
  coreTimes: Array<number | null>;
  /** Items 3 to 5 without boots (3 to 6 for an ADC or a build without boots), no duplicate between them nor with the core, at most
   * two alternatives each: the other items most bought at that slot. */
  next: Array<SlotItem & { slot: 3 | 4 | 5 | 6; alternatives: SlotItem[] }>;
  /** Boots with at most two alternatives; `slot`: their position in the line of items (1-based). Older files: ADC only,
   * without alternatives nor slot. */
  boots?: (SlotItem & { slot?: number; alternatives?: SlotItem[] }) | null;
  skills: (StatLine & { order: string; max: string }) | null;
}

export interface OpponentStat {
  champion: number;
  games: number;
  winRate: number;
}

/** Lane opponent of the counters tab (win rate of the page champion, gold lead at 15:00 when known). */
export interface CounterStat {
  championId: number;
  games: number;
  wins: number;
  winRate: number;
  goldDiff15?: number;
}

export interface ChampionBuild extends StatLine {
  patch: string;
  filter: BuildFilter;
  region: string;
  champion: number;
  role: Role;
  pickRate: number;
  banRate: number;
  tier: TierRank | null;
  delta: { winRate: number; pickRate: number; banRate: number } | null;
  lowSample: boolean;
  builds: BuildData[];
  weakAgainst: OpponentStat[];
  strongAgainst: OpponentStat[];
  /** Every lane opponent above the threshold (absent in files published before the counters tab). */
  counters?: { advantage: CounterStat[]; counter: CounterStat[] };
  synergy: Array<OpponentStat & { role: Role }>;
  summary: { fr: string; en: string };
}

export interface BuildIndex {
  patch: string;
  filter: BuildFilter;
  region: string;
  totalGames: number;
  champions: Array<{
    champion: number;
    roles: Array<{ role: Role; games: number; winRate: number; pickRate: number; banRate: number; tier: TierRank | null; lowSample: boolean }>;
  }>;
}

export interface BuildMeta {
  current: string;
  latest: string;
  patches: Array<{ patch: string; ddragonVersion: string; games: Record<string, number>; updatedAt: string }>;
  filters: BuildFilter[];
  regions: string[];
  minGamesForNewPatch: number;
  /** Sample data collected with a development key. */
  sample?: boolean;
}

/** Tier list of one patch and one rank band (`data/lol/tierlist/{patch}/{band}.json`), the five roles. */
export interface TierList {
  patch: string;
  band: 'low' | 'mid' | 'elite';
  generatedAt: string;
  totalGames: number;
  /** Reliability threshold: champions of a role under this many games are not ranked. */
  minGames: number;
  champions: Array<{ championId: number; role: Role; tier: TierRank; games: number; wins: number; winRate: number; pickRate: number }>;
  unranked: Array<{ championId: number; role: Role; games: number }>;
}

export interface StaticRune {
  id: number;
  name: string;
  icon: string;
  desc: string;
}

export interface StaticCore {
  version: string;
  items: Record<string, { name: string; cost: number; desc: string }>;
  runeTrees: Array<{ id: number; name: string; icon: string; slots: StaticRune[][] }>;
  shards: Record<string, { name: string; icon: string }>;
  summoners: Record<string, { name: string; icon: string; desc: string }>;
  champions: Record<string, { id: string; name: string }>;
}

export interface ChampionStatic {
  id: string;
  name: string;
  passive: { name: string; icon: string; desc: string };
  spells: Array<{ name: string; icon: string; desc: string }>;
}

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';
const CDRAGON = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/';
const ddLang = (lang: Lang) => (lang === 'fr' ? 'fr_FR' : 'en_US');

/** Loads the build statistics (static JSON files) and the localised Data Dragon data. */
@Injectable({ providedIn: 'root' })
export class BuildDataService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Promise<unknown>>();

  private get<T>(url: string): Promise<T | null> {
    let p = this.cache.get(url) as Promise<T | null> | undefined;
    if (!p) {
      p = firstValueFrom(this.http.get<T>(url)).catch(() => null);
      this.cache.set(url, p);
    }
    return p;
  }

  meta(): Promise<BuildMeta | null> {
    return this.get<BuildMeta>('data/lol/builds/meta.json');
  }

  index(patch: string, filter: BuildFilter, region = 'all'): Promise<BuildIndex | null> {
    return this.get<BuildIndex>(`data/lol/builds/${patch}/${filter}/${region === 'all' ? '' : `${region}/`}index.json`);
  }

  build(patch: string, filter: BuildFilter, ddragonId: string, role: Role, region = 'all'): Promise<ChampionBuild | null> {
    return this.get<ChampionBuild>(`data/lol/builds/${patch}/${filter}/${region === 'all' ? '' : `${region}/`}${ddragonId}_${role}.json`);
  }

  tierList(patch: string, band: TierList['band']): Promise<TierList | null> {
    return this.get<TierList>(`data/lol/tierlist/${patch}/${band}.json`);
  }

  core(version: string, lang: Lang): Promise<StaticCore | null> {
    return this.get<StaticCore>(`data/lol/static/${version}/${ddLang(lang)}/core.json`);
  }

  champion(version: string, lang: Lang, ddragonId: string): Promise<ChampionStatic | null> {
    return this.get<ChampionStatic>(`data/lol/static/${version}/${ddLang(lang)}/champions/${ddragonId}.json`);
  }

  // ---------- icons (Data Dragon / CommunityDragon CDNs) ----------

  itemIcon(version: string, id: number): string {
    return `${DDRAGON}/${version}/img/item/${id}.png`;
  }

  runeIcon(icon: string): string {
    return `${DDRAGON}/img/${icon}`;
  }

  shardIcon(icon: string): string {
    return `${CDRAGON}${icon}`;
  }

  spellIcon(version: string, image: string): string {
    return `${DDRAGON}/${version}/img/spell/${image}`;
  }

  passiveIcon(version: string, image: string): string {
    return `${DDRAGON}/${version}/img/passive/${image}`;
  }

  championIcon(version: string, ddragonId: string): string {
    return `${DDRAGON}/${version}/img/champion/${ddragonId}.png`;
  }

  splash(ddragonId: string): string {
    return `${DDRAGON}/img/champion/splash/${ddragonId}_0.jpg`;
  }
}
