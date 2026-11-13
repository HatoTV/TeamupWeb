import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChampionStatic, StaticCore } from '../../../core/data/build-data.service';
import { Lang } from '../../../core/site.config';
import { abilityKey } from '../../../shared/i18n/ability-key';
import { SKILL_COLORS } from '../build-utils';

export type PlayKey = 'Q' | 'W' | 'E' | 'R' | 'D' | 'F';
export type PlayLevel = 'easy' | 'medium' | 'hard';
export type PlayTag = 'mechanic' | 'passive' | 'terrain' | 'timing' | 'interaction';
type Bilingual = Record<Lang, string>;

/** « Tips pour jouer {champion} »: `assets/data/community-tips/play/{championId}.json` (schema: tools/community-tips/src/schema.ts). */
export interface PlayTipsFile {
  champion: string;
  patch: string;
  lastResearch: string;
  combos: Array<{ name: Bilingual; keys: PlayKey[]; summoners?: Partial<Record<'D' | 'F', string>>; level: PlayLevel; desc: Bilingual }>;
  tips: Array<{ tag: PlayTag; text: Bilingual }>;
  /** Kept for traceability, never displayed. */
  sources: unknown[];
}

export interface PlayStep {
  /** Key as shown to the player: A Z E R in French, Q W E R in English, D / F for summoner spells. */
  key: string;
  name: string;
  src: string;
  color: string;
}

export interface PlayCombo {
  name: string;
  level: PlayLevel;
  steps: PlayStep[];
  desc: string;
}

const SLOTS: Record<'Q' | 'W' | 'E' | 'R', 1 | 2 | 3 | 4> = { Q: 1, W: 2, E: 3, R: 4 };
const SUMMONER_COLOR = 'var(--color-text)';
const BASE = 'assets/data/community-tips/play';

/**
 * Combos of a file resolved against the localised Data Dragon data: spell names and icons, keys in the
 * page language. A combo whose spell cannot be resolved is left out rather than shown half empty.
 */
export function playCombos(
  file: PlayTipsFile,
  champion: ChampionStatic,
  core: StaticCore,
  lang: Lang,
  icon: (image: string) => string
): PlayCombo[] {
  const summoners = new Map(Object.values(core.summoners).map((s) => [s.icon.replace(/\.png$/, ''), s]));
  return file.combos.flatMap((combo) => {
    const steps: PlayStep[] = [];
    for (const key of combo.keys) {
      if (key === 'D' || key === 'F') {
        const spell = summoners.get(combo.summoners?.[key] ?? '');
        if (!spell) return [];
        steps.push({ key, name: spell.name, src: icon(spell.icon), color: SUMMONER_COLOR });
      } else {
        const slot = SLOTS[key];
        const spell = champion.spells[slot - 1];
        if (!spell) return [];
        steps.push({ key: abilityKey(key, lang), name: spell.name, src: icon(spell.icon), color: SKILL_COLORS[slot]! });
      }
    }
    return [{ name: combo.name[lang], level: combo.level, steps, desc: combo.desc[lang] }];
  });
}

/** Combos and mechanics tips per champion (index loaded once, one file per champion). */
@Injectable({ providedIn: 'root' })
export class PlayTipsService {
  private readonly http = inject(HttpClient);
  private index: Promise<{ champions: Record<string, string> } | null> | null = null;
  private readonly cache = new Map<string, Promise<PlayTipsFile | null>>();

  /** File of the champion, or null when it has not been researched (or on a network error). */
  async load(id: string): Promise<PlayTipsFile | null> {
    this.index ??= firstValueFrom(this.http.get<{ champions: Record<string, string> }>(`${BASE}/index.json`)).catch(() => {
      this.index = null;
      return null;
    });
    if (!(await this.index)?.champions[id]) return null;
    let request = this.cache.get(id);
    if (!request) {
      request = firstValueFrom(this.http.get<PlayTipsFile>(`${BASE}/${id}.json`)).catch(() => {
        this.cache.delete(id);
        return null;
      });
      this.cache.set(id, request);
    }
    return request;
  }
}
