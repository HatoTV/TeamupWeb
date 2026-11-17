import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BUILD_FILTERS, BuildDataService, BuildFilter, BuildIndex, BuildMeta, StaticCore, TierRank } from '../../core/data/build-data.service';
import { ChampionDataService, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { normalizeForSearch } from '../../core/slug';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { injectPageSeo } from '../../core/seo.service';
import { ROLE_ORDER, formatInt, formatRate, isBuildFilter, rankFilters } from './build-utils';
import { RankSelectComponent } from './rank-select.component';
import { TierSelectComponent } from './tier-select.component';
import { TierTileComponent } from '../tier-list/tier-tile.component';

type SortKey = 'name' | 'tier' | 'winRate' | 'pickRate' | 'banRate' | 'games';

interface ListRow {
  key: number;
  name: string;
  slug: string;
  icon: string;
  role: Role;
  tier: TierRank | null;
  winRate: number;
  pickRate: number;
  banRate: number;
  games: number;
  lowSample: boolean;
}

const TIER_ORDER: Record<string, number> = { 'S+': 0, S: 1, A: 2, B: 3, C: 4, D: 5 };
/** Rows per page of the list. */
export const PAGE_SIZE = 25;

/** Page numbers to show: first, last and the current one with its neighbours; `null` marks a gap. */
export function pageItems(current: number, total: number): Array<number | null> {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const pages = [...wanted].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1]! > 1) items.push(p - pages[i - 1]! === 2 ? p - 1 : null);
    items.push(p);
  });
  return items;
}

/** `/:lang/lol/builds`: every champion × role of the patch, sortable. */
@Component({
  selector: 'app-builds-list',
  standalone: true,
  imports: [TranslateModule, RouterLink, RankSelectComponent, IconComponent, TierTileComponent, TierSelectComponent],
  templateUrl: './builds-list.component.html',
  styleUrl: './builds-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildsListComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(BuildDataService);
  private readonly champions = inject(ChampionDataService);

  protected readonly columns: ReadonlyArray<{ key: SortKey; label: string }> = [
    { key: 'name', label: 'BUILDS.COL_CHAMPION' },
    { key: 'tier', label: 'BUILDS.COL_TIER' },
    { key: 'winRate', label: 'BUILDS.WIN_RATE' },
    { key: 'pickRate', label: 'BUILDS.PICK_RATE' },
    { key: 'banRate', label: 'BUILDS.BAN_RATE' },
    { key: 'games', label: 'BUILDS.GAMES' },
  ];
  protected readonly roles = ROLE_ORDER;
  /** Rank picked by the visitor; ignored when that rank has no games of its own. */
  protected readonly rank = signal<BuildFilter | null>(null);
  protected readonly meta = signal<BuildMeta | null | undefined>(undefined);
  /** Rank filters with games of their own tier; the widest one is the default. */
  protected readonly filters = computed<BuildFilter[]>(() => {
    const list = rankFilters(this.meta());
    return list.length ? list : [BUILD_FILTERS[0]];
  });
  protected readonly defaultFilter = computed(() => this.filters()[0]!);
  protected readonly filter = computed<BuildFilter>(() => (isBuildFilter(this.rank(), this.filters()) ? this.rank()! : this.defaultFilter()));
  protected readonly role = signal<Role | null>(null);
  protected readonly search = signal('');
  /** Tiers kept in the list; empty = every tier. */
  protected readonly tiers = signal<TierRank[]>([]);
  protected readonly page = signal(1);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  protected readonly sort = signal<{ key: SortKey; dir: 1 | -1 }>({ key: 'tier', dir: 1 });
  protected readonly index = signal<BuildIndex | null>(null);
  protected readonly core = signal<StaticCore | null>(null);
  protected readonly loading = signal(true);
  protected readonly fmtRate = (v: number) => formatRate(v, this.ctx.lang());
  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());

  protected readonly rows = computed<ListRow[]>(() => {
    const index = this.index();
    const core = this.core();
    const champs = this.champions.index()?.champions ?? [];
    if (!index || !core) return [];
    const version = core.version;
    // Punctuation-free so "kaisa" finds Kai'Sa and "dr mundo" finds Dr. Mundo.
    const searchKey = (v: string) => normalizeForSearch(v).replace(/[^a-z0-9]/g, '');
    const query = searchKey(this.search());
    const rows: ListRow[] = [];
    for (const c of index.champions) {
      const info = core.champions[c.champion];
      const site = champs.find((x) => x.ddragonId === info?.id);
      if (!info || !site) continue;
      if (query && !searchKey(info.name).includes(query)) continue;
      for (const r of c.roles) {
        if (this.role() && r.role !== this.role()) continue;
        if (this.tiers().length && !(r.tier && this.tiers().includes(r.tier))) continue;
        rows.push({ key: c.champion, name: info.name, slug: site.slug, icon: this.data.championIcon(version, info.id), ...r });
      }
    }
    const { key, dir } = this.sort();
    const value = (row: ListRow): number | string => (key === 'name' ? row.name : key === 'tier' ? (row.tier ? TIER_ORDER[row.tier]! : 9) : row[key]);
    return rows.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      // Rates are sorted high → low by default, names and tiers low → high.
      return (key === 'name' || key === 'tier' ? cmp : -cmp) * dir || a.name.localeCompare(b.name);
    });
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.rows().length / PAGE_SIZE)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly pageRows = computed(() => this.rows().slice((this.currentPage() - 1) * PAGE_SIZE, this.currentPage() * PAGE_SIZE));
  protected readonly pages = computed(() => pageItems(this.currentPage(), this.pageCount()));
  protected readonly range = computed(() => {
    const total = this.rows().length;
    const from = (this.currentPage() - 1) * PAGE_SIZE + 1;
    return { from: this.fmtInt(from), to: this.fmtInt(Math.min(total, from + PAGE_SIZE - 1)), total: this.fmtInt(total) };
  });

  constructor() {
    // Any new filter or sort starts again from the first page.
    effect(() => {
      this.search();
      this.role();
      this.tiers();
      this.filter();
      this.sort();
      untracked(() => this.page.set(1));
    });
    injectPageSeo(() => ({ titleKey: 'BUILDS.LIST_SEO_TITLE', descriptionKey: 'BUILDS.LIST_SEO_DESC', params: { patch: this.meta()?.latest ?? '' } }));
    void this.champions.loadIndex().catch(() => undefined);
    void this.data.meta().then((meta) => this.meta.set(meta));
    effect(() => {
      const filter = this.filter();
      const lang = this.ctx.lang();
      if (this.meta() === undefined) return;
      untracked(() => void this.load(filter, lang));
    });
  }

  private async load(filter: BuildFilter, lang: 'fr' | 'en'): Promise<void> {
    this.loading.set(true);
    const meta = await this.data.meta();
    this.meta.set(meta);
    if (meta) {
      const latest = meta.patches.find((p) => p.patch === meta.latest) ?? meta.patches[0]!;
      const [index, core] = await Promise.all([this.data.index(latest.patch, filter), this.data.core(latest.ddragonVersion, lang)]);
      this.index.set(index);
      this.core.set(core);
    }
    this.loading.set(false);
  }

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
    // Back to the top of the list when the pager (below it) moved it out of view.
    // The wrapper, not the table: the table scrolls sideways inside it on mobile.
    const list = this.list()?.nativeElement;
    if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: 'start' });
  }

  protected sortBy(key: SortKey): void {
    const current = this.sort();
    this.sort.set({ key, dir: current.key === key ? (-current.dir as 1 | -1) : 1 });
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    const s = this.sort();
    if (s.key !== key) return 'none';
    const ascending = (key === 'name' || key === 'tier') === (s.dir === 1);
    return ascending ? 'ascending' : 'descending';
  }
}
