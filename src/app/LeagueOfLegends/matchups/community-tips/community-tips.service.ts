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
  sources: Array<{ title: string; site: string; url: string; consultedAt: string }>;
}

interface TipsIndex {
  pairs: Record<string, TipsStatus>;
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
  private readonly cache = new Map<string, Promise<CommunityTipsFile | null>>();

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
}
