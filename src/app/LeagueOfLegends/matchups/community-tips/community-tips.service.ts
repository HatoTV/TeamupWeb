import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Mirrors `tools/community-tips/src/schema.ts` (validated there with zod). */
export const TIP_CATEGORIES = ['lane', 'mechanics', 'macro'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];
export type TipsStatus = 'ok' | 'insufficientSources' | 'needsRecheck';

export interface CommunityTip {
  text: string;
  sources: number;
  verifiedByGameData: boolean;
  /** Not displayed: tie-break of the display order. */
  category: TipCategory;
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

/** « 12 nov. 2026 » (fr), « Nov 12, 2026 » (en), from an ISO date (YYYY-MM-DD). */
export function formatSourceDate(iso: string, lang: 'fr' | 'en'): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
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
