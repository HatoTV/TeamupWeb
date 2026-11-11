import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LOL_GUIDE_GROUPS } from '../../core/navigation/lol-nav';
import { normalizeForSearch, slugify } from '../../core/slug';

export type SearchGroupId = 'champions' | 'guides' | 'mechanics';

export interface SearchEntry {
  id: string;
  group: SearchGroupId;
  label: string;
  /** Secondary line (already translated). */
  detail: string;
  /** Path without language prefix. */
  path: string;
  fragment?: string;
  queryParams?: Record<string, string>;
}

export interface SearchGroup {
  id: SearchGroupId;
  labelKey: string;
  entries: SearchEntry[];
}

interface ChampionRow {
  championName: string;
}

interface MechanicRow {
  name: string;
  subname?: string;
}

const GROUP_LABELS: Record<SearchGroupId, string> = {
  champions: 'SEARCH.GROUP_CHAMPIONS',
  guides: 'SEARCH.GROUP_GUIDES',
  mechanics: 'SEARCH.GROUP_MECHANICS',
};

/** Client-side index for the global search (champions, LoL/TFT guides, RL mechanics). */
@Injectable({ providedIn: 'root' })
export class SearchIndexService {
  private readonly http = inject(HttpClient);
  private readonly translate = inject(TranslateService);

  private readonly champions = signal<string[]>([]);
  private readonly mechanics = signal<MechanicRow[]>([]);
  private loading: Promise<void> | null = null;

  /** Fetches the data sources once (lazily, on first interaction). */
  load(): Promise<void> {
    this.loading ??= Promise.all([
      firstValueFrom(this.http.get<ChampionRow[]>('assets/jsonChampionsDatas/AllChampions.json')),
      firstValueFrom(this.http.get<MechanicRow[]>('assets/rlmecanics.json')),
    ])
      .then(([champions, mechanics]) => {
        const names = new Set(champions.map((c) => c.championName.trim()).filter(Boolean));
        this.champions.set([...names].sort((a, b) => a.localeCompare(b)));
        this.mechanics.set(mechanics);
      })
      .catch(() => {
        this.loading = null; // allow a retry on next focus
      });
    return this.loading;
  }

  search(query: string, limitPerGroup = 5): SearchGroup[] {
    const q = normalizeForSearch(query);
    if (!q) return [];
    const t = (key: string) => this.translate.instant(key) as string;

    const champions: SearchEntry[] = this.champions().map((name) => ({
      id: `champion-${slugify(name)}`,
      group: 'champions',
      label: name,
      detail: t('SEARCH.CHAMPION_HINT'),
      path: '/lol/matchups',
      queryParams: { champion: name },
    }));

    const guides: SearchEntry[] = [];
    for (const group of LOL_GUIDE_GROUPS) {
      const groupLabel = t(group.labelKey);
      guides.push({ id: `guide-${group.id}`, group: 'guides', label: groupLabel, detail: t('GAMES.LOL'), path: group.path });
      for (const item of group.items) {
        guides.push({
          id: `guide-${group.id}-${item.fragment}`,
          group: 'guides',
          label: t(item.labelKey),
          detail: `${t('GAMES.LOL')} · ${groupLabel}`,
          path: group.path,
          fragment: item.fragment,
        });
      }
    }
    guides.push({ id: 'guide-tft', group: 'guides', label: t('TFT.SUBBIGTITLE'), detail: t('GAMES.TFT'), path: '/tft' });

    const mechanics: SearchEntry[] = this.mechanics().map((m) => ({
      id: `mechanic-${slugify(m.name)}`,
      group: 'mechanics',
      label: m.subname ? `${m.name} ${m.subname}` : m.name,
      detail: t('GAMES.RL'),
      path: `/rocket/mecanics/${slugify(m.name)}`,
    }));

    const rank = (entry: SearchEntry): number => {
      const label = normalizeForSearch(entry.label);
      if (label.startsWith(q)) return 0;
      if (label.split(/[\s'’-]+/).some((w) => w.startsWith(q))) return 1;
      if (label.includes(q)) return 2;
      if (normalizeForSearch(entry.detail).includes(q)) return 3;
      return -1;
    };

    const pick = (entries: SearchEntry[]) =>
      entries
        .map((entry) => ({ entry, score: rank(entry) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => a.score - b.score)
        .slice(0, limitPerGroup)
        .map((r) => r.entry);

    return (
      [
        { id: 'champions', entries: pick(champions) },
        { id: 'guides', entries: pick(guides) },
        { id: 'mechanics', entries: pick(mechanics) },
      ] as const
    )
      .filter((g) => g.entries.length > 0)
      .map((g) => ({ id: g.id, labelKey: GROUP_LABELS[g.id], entries: g.entries }));
  }
}
