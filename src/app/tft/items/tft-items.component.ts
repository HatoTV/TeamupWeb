import { ChangeDetectionStrategy, Component, ElementRef, computed, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PatchSelectComponent } from '../../LeagueOfLegends/builds/patch-select.component';
import { RankSelectComponent } from '../../LeagueOfLegends/builds/rank-select.component';
import { TierTileComponent } from '../../LeagueOfLegends/tier-list/tier-tile.component';
import { injectPageSeo } from '../../core/seo.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TftItem, TftItemKind, TftItemStats } from '../logic/tft-types';
import { fold } from '../tft-data.service';
import { TftStatsPage } from '../tft-page';
import { TftChampComponent, TftItemComponent } from '../ui/tft-ui.components';

type Tab = Extract<TftItemKind, 'complete' | 'emblem' | 'component'>;
const TABS: readonly Tab[] = ['complete', 'emblem', 'component'];
/** Holders shown in a list row. */
const ROW_HOLDERS = 3;

interface ItemRow {
  item: TftItem;
  stats: TftItemStats | null;
}

/** `/:lang/tft/objets[/:slug]?tab=&rank=&queue=&patch=&q=`: item list and the selected item's best holders. */
@Component({
  selector: 'app-tft-items',
  standalone: true,
  imports: [TranslateModule, RouterLink, RankSelectComponent, PatchSelectComponent, TierTileComponent, IconComponent, TftItemComponent, TftChampComponent],
  templateUrl: './tft-items.component.html',
  styleUrls: ['../tft-page.scss', './tft-items.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftItemsComponent extends TftStatsPage {
  protected readonly tabs = TABS;
  private readonly params = toSignal(this.route.paramMap);
  private readonly slug = computed(() => this.params()?.get('slug') ?? null);
  protected readonly tab = computed<Tab>(() => {
    const t = this.query()?.get('tab') as Tab | null;
    if (t && TABS.includes(t)) return t;
    const selected = this.slug() ? this.catalog()?.itemBySlug(this.slug()!) : undefined;
    return selected && TABS.includes(selected.kind as Tab) ? (selected.kind as Tab) : 'complete';
  });
  protected readonly search = computed(() => this.query()?.get('q') ?? '');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly statsById = computed(() => new Map((this.stats()?.items ?? []).map((i) => [i.id, i])));

  protected readonly counts = computed(() => {
    const items = this.catalog()?.items ?? [];
    return Object.fromEntries(TABS.map((t) => [t, items.filter((i) => i.kind === t).length])) as Record<Tab, number>;
  });

  /** Items of the tab: with statistics first (best average place), then the others by name. */
  protected readonly rows = computed<ItemRow[]>(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const q = fold(this.search().trim());
    const byId = this.statsById();
    return catalog.items
      .filter((i) => i.kind === this.tab() && (!q || fold(i.name).includes(q)))
      .map((item) => ({ item, stats: byId.get(item.id) ?? null }))
      .sort((a, b) => (a.stats && b.stats ? a.stats.avg - b.stats.avg : a.stats ? -1 : b.stats ? 1 : a.item.name.localeCompare(b.item.name)));
  });

  /** Selected item (`:slug`), or the first of the list. */
  protected readonly selected = computed<ItemRow | null>(() => {
    const catalog = this.catalog();
    const slug = this.slug();
    if (!catalog) return null;
    const item = slug ? catalog.itemBySlug(slug) : this.rows()[0]?.item;
    return item ? { item, stats: this.statsById().get(item.id) ?? null } : null;
  });

  protected readonly minHolderGames = computed(() => {
    const games = this.selected()?.stats?.holders.map((h) => h.games) ?? [];
    return games.length ? Math.min(...games) : 100;
  });

  constructor() {
    super();
    injectPageSeo(() => {
      const item = this.slug() ? this.selected()?.item : null;
      const params = { set: this.set() ?? '', patch: this.patch() ?? '', name: item?.name ?? '' };
      return item ? { titleKey: 'TFTDATA.SEO.ITEM_TITLE', descriptionKey: 'TFTDATA.SEO.ITEM_DESC', params, image: item.icon ?? undefined } : { titleKey: 'TFTDATA.SEO.ITEMS_TITLE', descriptionKey: 'TFTDATA.SEO.ITEMS_DESC', params, image: '/assets/img/site/bkgContent_Tft.webp' };
    });
  }

  protected itemLink(item: TftItem): string[] {
    return [this.ctx.link(`/tft/objets/${item.slug}`)];
  }

  protected holders(stats: TftItemStats | null): TftItemStats['holders'] {
    return stats?.holders.slice(0, ROW_HOLDERS) ?? [];
  }

  protected setTab(tab: Tab): void {
    void this.router.navigate([this.ctx.link('/tft/objets')], { queryParams: { tab: tab === 'complete' ? null : tab }, queryParamsHandling: 'merge' });
  }

  protected setSearch(value: string): void {
    this.setQuery({ q: value.trim() ? value : null });
  }

  /** On one column (under 1200 px), selecting an item brings its detail into view. */
  protected reveal(): void {
    if (typeof window === 'undefined' || window.innerWidth >= 1200) return;
    setTimeout(() => this.panel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  protected scrollToList(): void {
    if (typeof document !== 'undefined') document.getElementById('items-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
