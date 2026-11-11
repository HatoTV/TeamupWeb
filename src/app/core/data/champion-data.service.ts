import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';
export const ROLES: readonly Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export interface Champion {
  slug: string;
  name: string;
  ddragonId: string | null;
  roles: Role[];
  /** Picker difficulty, 1 (very easy) to 5 (extreme). */
  difficulty: number | null;
  hasMatchups: boolean;
  aliases?: string[];
}

export interface ChampionIndex {
  /** Data Dragon version resolved at build time (tools/split-guides.mjs). */
  version: string;
  champions: Champion[];
}

export interface MatchupTip {
  enemy: string;
  /** Difficulty for the selected champion, 1 (very easy) to 5 (extreme). */
  level: number;
  tips: string;
  tipsFr?: string;
}

export interface ChampionMatchups {
  champion: string;
  author: string | null;
  rank: string | null;
  urlGuide: string | null;
  urlGuideFr: string | null;
  matchups: MatchupTip[];
}

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';

/** League of Legends data: light champion index + per-champion matchup files, Data Dragon art. */
@Injectable({ providedIn: 'root' })
export class ChampionDataService {
  private readonly http = inject(HttpClient);
  private indexPromise: Promise<ChampionIndex> | null = null;
  private readonly matchupCache = new Map<string, Promise<ChampionMatchups | null>>();

  /** Index once loaded (null before). */
  readonly index = signal<ChampionIndex | null>(null);

  loadIndex(): Promise<ChampionIndex> {
    this.indexPromise ??= firstValueFrom(this.http.get<ChampionIndex>('assets/data/champions.json'))
      .then((index) => {
        this.index.set(index);
        return index;
      })
      .catch((error) => {
        this.indexPromise = null;
        throw error;
      });
    return this.indexPromise;
  }

  /** Matchup file of one champion, or null when the champion has no data. */
  loadMatchups(slug: string): Promise<ChampionMatchups | null> {
    let request = this.matchupCache.get(slug);
    if (!request) {
      request = firstValueFrom(this.http.get<ChampionMatchups>(`assets/data/matchups/${slug}.json`)).catch(() => {
        this.matchupCache.delete(slug);
        return null;
      });
      this.matchupCache.set(slug, request);
    }
    return request;
  }

  findByName(name: string): Champion | undefined {
    const key = name.trim().toLowerCase();
    return this.index()?.champions.find((c) => c.name.toLowerCase() === key || c.slug === key);
  }

  iconUrl(champion: Pick<Champion, 'ddragonId'>): string {
    const version = this.index()?.version;
    return champion.ddragonId && version ? `${DDRAGON}/${version}/img/champion/${champion.ddragonId}.png` : '';
  }

  splashUrl(champion: Pick<Champion, 'ddragonId'>, skin = 0): string {
    return champion.ddragonId ? `${DDRAGON}/img/champion/splash/${champion.ddragonId}_${skin}.jpg` : '';
  }
}
