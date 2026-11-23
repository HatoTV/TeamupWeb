import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Lang } from '../core/site.config';
import { SynergyLookup, synergyLookup } from './logic/synergies';
import {
  TftChampion,
  TftCompOverride,
  TftItem,
  TftQueue,
  TftRankFilter,
  TftStatic,
  TftStatsFile,
  TftStatsMeta,
  TftTrait,
} from './logic/tft-types';

export const TFT_QUEUES: readonly TftQueue[] = ['ranked', 'double_up'];
export const TFT_RANKS: readonly TftRankFilter[] = ['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus'];
export const DEFAULT_RANK: TftRankFilter = 'platinum_plus';
/** A new patch is shown by default two days after its release (few games before), like the LoL pages. */
const NEW_PATCH_GRACE_MS = 48 * 3_600_000;

/** Static set data with lookups (champions, traits, items by id or alias, slug and short id). */
export class TftCatalog {
  readonly champions: readonly TftChampion[];
  /** Champions shown in lists (forms such as `Lux (Fae)` hidden), by cost then name. */
  readonly listed: readonly TftChampion[];
  readonly traits: readonly TftTrait[];
  readonly items: readonly TftItem[];
  readonly synergies: SynergyLookup;
  private readonly championById: Map<string, TftChampion>;
  private readonly traitById: Map<string, TftTrait>;
  private readonly itemById = new Map<string, TftItem>();

  constructor(readonly data: TftStatic) {
    this.champions = data.champions;
    this.traits = data.traits;
    this.items = data.items;
    this.listed = data.champions.filter((c) => !c.variantOf).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    this.championById = new Map(data.champions.map((c) => [c.id, c]));
    this.traitById = new Map(data.traits.map((t) => [t.id, t]));
    for (const i of data.items) for (const id of [i.id, ...(i.aliases ?? [])]) this.itemById.set(id, i);
    this.synergies = synergyLookup(data);
  }

  champion(id: string): TftChampion | undefined {
    return this.championById.get(id);
  }
  trait(id: string): TftTrait | undefined {
    return this.traitById.get(id);
  }
  item(id: string): TftItem | undefined {
    return this.itemById.get(id);
  }
  championBySlug(slug: string): TftChampion | undefined {
    return this.listed.find((c) => c.slug === slug);
  }
  itemBySlug(slug: string): TftItem | undefined {
    return this.items.find((i) => i.slug === slug);
  }
  championByShort(short: string): TftChampion | undefined {
    return this.champions.find((c) => c.short === short);
  }
  itemByShort(short: string): TftItem | undefined {
    return this.items.find((i) => i.short === short);
  }
  championsOfTrait(trait: string): TftChampion[] {
    return this.listed.filter((c) => c.traits.includes(trait));
  }
}

/** Loads the TFT static data (CommunityDragon, tools/tft-static) and statistics (tools/tft-stats). */
@Injectable({ providedIn: 'root' })
export class TftDataService {
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

  async catalog(lang: Lang): Promise<TftCatalog | null> {
    const key = `catalog:${lang}`;
    let p = this.cache.get(key) as Promise<TftCatalog | null> | undefined;
    if (!p) {
      p = (async () => {
        const current = await this.get<{ set: number }>('data/tft/static/current.json');
        const data = current ? await this.get<TftStatic>(`data/tft/static/set${current.set}/${lang}.json`) : null;
        return data ? new TftCatalog(data) : null;
      })();
      this.cache.set(key, p);
    }
    return p;
  }

  meta(): Promise<TftStatsMeta | null> {
    return this.get<TftStatsMeta>('data/tft/stats/meta.json');
  }

  stats(patch: string, queue: TftQueue, filter: TftRankFilter): Promise<TftStatsFile | null> {
    return this.get<TftStatsFile>(`data/tft/stats/${patch}/${queue}/${filter}.json`);
  }

  async overrides(): Promise<Record<string, TftCompOverride>> {
    return (await this.get<Record<string, TftCompOverride>>('data/tft/tft-comps-overrides.json')) ?? {};
  }
}

/** Patch shown by default: the previous one during the first two days of a new patch, then the newest. */
export function defaultTftPatch(meta: TftStatsMeta | null | undefined, now = Date.now()): string | null {
  if (!meta?.patches.length) return null;
  const latest = meta.patches.find((p) => p.patch === meta.latest) ?? meta.patches[0]!;
  const previous = meta.patches.find((p) => p.patch !== latest.patch);
  const released = latest.releasedAt ? Date.parse(latest.releasedAt) : NaN;
  return previous && Number.isFinite(released) && now - released < NEW_PATCH_GRACE_MS ? previous.patch : latest.patch;
}

export function resolveTftPatch(meta: TftStatsMeta | null | undefined, requested: string | null | undefined, now = Date.now()): string | null {
  return requested && meta?.patches.some((p) => p.patch === requested) ? requested : defaultTftPatch(meta, now);
}

export const isTftRank = (v: string | null | undefined): v is TftRankFilter => !!v && (TFT_RANKS as readonly string[]).includes(v);
export const isTftQueue = (v: string | null | undefined): v is TftQueue => !!v && (TFT_QUEUES as readonly string[]).includes(v);

/** Normalised text for searches (accents and case ignored). */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
