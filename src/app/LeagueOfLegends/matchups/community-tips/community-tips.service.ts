import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Mirrors `tools/community-tips/src/schema.ts` (validated there with zod). */
export const TIP_CATEGORIES = ['lane', 'mechanics', 'macro'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];
/** Displayed sub-headings, in display order (absent = general). */
export const TIP_SECTIONS = ['general', 'lane', 'avoid'] as const;
export type TipSection = (typeof TIP_SECTIONS)[number];
export type TipsStatus = 'ok' | 'insufficientSources' | 'needsRecheck';

export interface CommunityTip {
  text: string;
  sources: number;
  verifiedByGameData: boolean;
  /** Not displayed: tie-break of the display order. */
  category: TipCategory;
  /** Displayed sub-heading; absent = general. */
  section?: TipSection;
}

export interface TipGroup {
  section: TipSection;
  tips: CommunityTip[];
}

/**
 * Tips grouped by sub-heading (general, laning phase, avoid), empty groups dropped. In each group, the tips of the
 * pair (`pair`, specific to the champion played) come first, then the « how to play against » ones (`vs`).
 */
export function groupTips(pair: readonly CommunityTip[], vs: readonly CommunityTip[]): TipGroup[] {
  const all = [...pair, ...vs];
  return TIP_SECTIONS.map((section) => ({ section, tips: all.filter((t) => (t.section ?? 'general') === section) })).filter((g) => g.tips.length);
}

export interface CommunityTipsFile {
  pair: [string, string];
  researchedAt: string;
  gameVersion: string;
  status: TipsStatus;
  perspectives: Record<string, { fr: CommunityTip[]; en: CommunityTip[] }>;
  sources: Array<{
    title: string;
    site: string;
    url: string;
    consultedAt: string;
    /** Video sources only. */
    channel?: string;
    publishedAt?: string;
    timestamps?: string[];
  }>;
}

/** « How to play against {champion} »: tips valid whatever champion you play (`vs/{championId}.json`). */
export interface VsTipsFile {
  champion: string;
  researchedAt: string;
  gameVersion: string;
  status: TipsStatus;
  tips: { fr: CommunityTip[]; en: CommunityTip[] };
  sources: CommunityTipsFile['sources'];
}

interface TipsIndex {
  pairs: Record<string, TipsStatus>;
}

interface VsIndex {
  champions: Record<string, TipsStatus>;
}

const BASE = 'assets/data/community-tips';
/** Tips shown per perspective. */
export const MAX_TIPS = 8;

/** Display order: sources read (desc), verified in game data first, then lane, mechanics, macro. */
export function sortTips(tips: readonly CommunityTip[]): CommunityTip[] {
  return [...tips]
    .sort(
      (a, b) =>
        b.sources - a.sources ||
        Number(b.verifiedByGameData) - Number(a.verifiedByGameData) ||
        TIP_CATEGORIES.indexOf(a.category) - TIP_CATEGORIES.indexOf(b.category)
    )
    .slice(0, MAX_TIPS);
}

/** Below this many tips, a perspective is not shown (« not enough sources yet »). */
export const MIN_TIPS_PER_SIDE = 2;

/** Tips of one perspective in display order, or [] when the file has too few for that side. */
export function sideTips(file: CommunityTipsFile | null | undefined, id: string | null | undefined, lang: 'fr' | 'en'): CommunityTip[] {
  if (!file || file.status === 'insufficientSources' || !id) return [];
  const tips = sortTips(file.perspectives[id]?.[lang] ?? []);
  return tips.length >= MIN_TIPS_PER_SIDE ? tips : [];
}

/** Tips of a « how to play against » file in display order, or [] when it has too few. */
export function vsTips(file: VsTipsFile | null | undefined, lang: 'fr' | 'en'): CommunityTip[] {
  if (!file || file.status === 'insufficientSources') return [];
  const tips = sortTips(file.tips[lang] ?? []);
  return tips.length >= MIN_TIPS_PER_SIDE ? tips : [];
}

/** Community tips of a champion pair (index loaded once, one file per pair). */
@Injectable({ providedIn: 'root' })
export class CommunityTipsService {
  private readonly http = inject(HttpClient);
  private index: Promise<TipsIndex | null> | null = null;
  private vsIndex: Promise<VsIndex | null> | null = null;
  private readonly cache = new Map<string, Promise<CommunityTipsFile | null>>();
  private readonly vsCache = new Map<string, Promise<VsTipsFile | null>>();

  /** Tips of the pair, or null when it has not been researched (or on a network error). */
  async load(a: string, b: string): Promise<CommunityTipsFile | null> {
    const key = [a, b].sort().join('__');
    this.index ??= firstValueFrom(this.http.get<TipsIndex>(`${BASE}/index.json`)).catch(() => {
      this.index = null;
      return null;
    });
    if (!(await this.index)?.pairs[key]) return null;
    let request = this.cache.get(key);
    if (!request) {
      request = firstValueFrom(this.http.get<CommunityTipsFile>(`${BASE}/${key}.json`)).catch(() => {
        this.cache.delete(key);
        return null;
      });
      this.cache.set(key, request);
    }
    return request;
  }

  /** « How to play against » file of a champion, or null when it has not been researched (or on a network error). */
  async loadVs(id: string): Promise<VsTipsFile | null> {
    this.vsIndex ??= firstValueFrom(this.http.get<VsIndex>(`${BASE}/vs/index.json`)).catch(() => {
      this.vsIndex = null;
      return null;
    });
    if (!(await this.vsIndex)?.champions[id]) return null;
    let request = this.vsCache.get(id);
    if (!request) {
      request = firstValueFrom(this.http.get<VsTipsFile>(`${BASE}/vs/${id}.json`)).catch(() => {
        this.vsCache.delete(id);
        return null;
      });
      this.vsCache.set(id, request);
    }
    return request;
  }
}
