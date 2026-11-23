import { ChangeDetectionStrategy, Component, computed, effect, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PatchSelectComponent } from '../../LeagueOfLegends/builds/patch-select.component';
import { RankSelectComponent } from '../../LeagueOfLegends/builds/rank-select.component';
import { TierTileComponent } from '../../LeagueOfLegends/tier-list/tier-tile.component';
import { injectPageSeo } from '../../core/seo.service';
import { DifficultyBadgeComponent } from '../../shared/ui/difficulty-badge.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { encodeBoard, recommendedPlacement } from '../logic/board';
import { computeSynergies } from '../logic/synergies';
import { TftComp, TftCompOverride } from '../logic/tft-types';
import { TftCatalog, fold } from '../tft-data.service';
import { TIER_ORDER, TftStatsPage } from '../tft-page';
import { BoardCell, TftBoardComponent } from '../ui/tft-board.component';
import { TftChampComponent, TftItemComponent, TftTraitComponent } from '../ui/tft-ui.components';

type SortKey = 'tier' | 'avg' | 'top4' | 'win';
const SORTS: readonly SortKey[] = ['tier', 'avg', 'top4', 'win'];

/** `/:lang/tft/compositions?rank=&queue=&patch=&q=&sort=&comp=`: comps of the patch, one unfolded at a time. */
@Component({
  selector: 'app-tft-comps',
  standalone: true,
  imports: [
    TranslateModule,
    RouterLink,
    RankSelectComponent,
    PatchSelectComponent,
    TierTileComponent,
    DifficultyBadgeComponent,
    IconComponent,
    TftChampComponent,
    TftItemComponent,
    TftTraitComponent,
    TftBoardComponent,
  ],
  templateUrl: './tft-comps.component.html',
  styleUrls: ['../tft-page.scss', './tft-comps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftCompsComponent extends TftStatsPage {
  protected readonly sorts = SORTS;
  protected readonly search = computed(() => this.query()?.get('q') ?? '');
  protected readonly sort = computed<SortKey>(() => {
    const s = this.query()?.get('sort') as SortKey | null;
    return s && SORTS.includes(s) ? s : 'tier';
  });
  protected readonly open = computed(() => this.query()?.get('comp') ?? null);
  protected readonly overrides = signal<Record<string, TftCompOverride>>({});

  /** Comps with their display data, filtered and sorted. */
  protected readonly rows = computed(() => {
    const file = this.stats();
    const catalog = this.catalog();
    if (!file || !catalog) return [];
    const q = fold(this.search().trim());
    const rows = file.comps.map((comp) => this.view(comp, catalog));
    const filtered = q ? rows.filter((r) => r.haystack.includes(q)) : rows;
    const sort = this.sort();
    return [...filtered].sort((a, b) => {
      const x = a.comp;
      const y = b.comp;
      if (sort === 'avg') return x.avg - y.avg;
      if (sort === 'top4') return y.top4 - x.top4;
      if (sort === 'win') return y.win - x.win;
      return TIER_ORDER.indexOf(x.tier) - TIER_ORDER.indexOf(y.tier) || x.avg - y.avg;
    });
  });

  protected readonly updated = computed(() => {
    const at = this.stats()?.generatedAt;
    if (!at) return null;
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(at)) / 60_000));
    const rtf = new Intl.RelativeTimeFormat(this.ctx.lang(), { numeric: 'auto' });
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    if (minutes < 48 * 60) return rtf.format(-Math.round(minutes / 60), 'hour');
    return rtf.format(-Math.round(minutes / 1440), 'day');
  });

  constructor() {
    super();
    injectPageSeo(() => ({ titleKey: 'TFTDATA.SEO.COMPS_TITLE', descriptionKey: 'TFTDATA.SEO.COMPS_DESC', params: { set: this.set() ?? '', patch: this.patch() ?? '' }, image: '/assets/img/site/bkgContent_Tft.webp' }));
    void this.data.overrides().then((o) => this.overrides.set(o));
    // Bring the comp opened from a link into view once the list is rendered.
    effect(() => {
      const id = this.open();
      if (!id || !this.rows().length || typeof document === 'undefined') return;
      untracked(() => setTimeout(() => document.getElementById(`comp-${id}`)?.scrollIntoView({ block: 'nearest' }), 0));
    });
  }

  private view(comp: TftComp, catalog: TftCatalog) {
    const carries = new Map(comp.carries.map((c) => [c.unit, c]));
    const units = comp.units.map((u) => ({
      ...u,
      champion: catalog.champion(u.id),
      carry: carries.has(u.id),
      items: (carries.get(u.id)?.items ?? []).map((i) => catalog.item(i.item)),
    }));
    const synergies = computeSynergies(
      units.map((u) => ({ champion: u.id, items: carries.get(u.id)?.items.map((i) => i.item) })),
      catalog.synergies
    ).filter((s) => s.style);
    const names = [
      ...units.map((u) => u.champion?.name ?? ''),
      ...synergies.map((s) => catalog.trait(s.trait)?.name ?? ''),
      ...comp.carries.flatMap((c) => [...c.items, ...c.alternatives].map((i) => catalog.item(i.item)?.name ?? '')),
    ];
    return {
      comp,
      name: `${catalog.trait(comp.trait)?.name ?? ''} ${catalog.champion(comp.carry)?.name ?? ''}`.trim(),
      units,
      synergies: synergies.map((s) => ({ ...s, info: catalog.trait(s.trait) })),
      /** Screen readers: units, carries marked with a star. */
      unitNames: units.map((u) => `${u.champion?.name ?? u.id}${u.carry ? ' ★' : ''}`).join(', '),
      haystack: fold(names.join(' ')),
    };
  }

  // ---------- unfolded comp ----------

  protected toggle(id: string): void {
    this.setQuery({ comp: this.open() === id ? null : id });
  }

  protected placement(comp: TftComp): BoardCell[] {
    const catalog = this.catalog();
    if (!catalog) return [];
    const carries = new Map(comp.carries.map((c) => [c.unit, c]));
    const manual = this.overrides()[comp.id]?.placement;
    const cells = manual
      ? new Map(Object.entries(manual))
      : recommendedPlacement(
          comp.units.map((u) => ({ id: u.id, carry: carries.has(u.id) })),
          (id) => catalog.champion(id)
        );
    return comp.units.flatMap((u) => {
      const champion = catalog.champion(u.id);
      const cell = cells.get(u.id);
      return champion && cell !== undefined ? [{ cell, champion, stars: u.stars, items: (carries.get(u.id)?.items ?? []).map((i) => catalog.item(i.item)) }] : [];
    });
  }

  protected override(id: string): TftCompOverride | undefined {
    return this.overrides()[id];
  }

  protected noteOf(o: TftCompOverride | undefined): string | null {
    return o?.notes?.[this.ctx.lang()] ?? null;
  }

  /** Team builder link with the comp on its recommended board. */
  protected builderLink(comp: TftComp): { b: string } | null {
    const catalog = this.catalog();
    if (!catalog) return null;
    const carries = new Map(comp.carries.map((c) => [c.unit, c]));
    const code = encodeBoard(
      this.placement(comp).map((u) => ({ champion: u.champion.id, stars: u.stars, cell: u.cell, items: (carries.get(u.champion.id)?.items ?? []).map((i) => i.item) })),
      { champion: (id) => catalog.champion(id)?.short, item: (id) => catalog.item(id)?.short }
    );
    return { b: code };
  }

  protected levelLabel(comp: TftComp): { key: string; level: number } {
    const s = comp.levelStyle;
    return { key: `TFTDATA.LEVEL.${s.kind.toUpperCase()}`, level: s.level };
  }

  protected setSearch(value: string): void {
    this.setQuery({ q: value.trim() ? value : null });
  }

  protected setSort(sort: SortKey): void {
    this.setQuery({ sort: sort === 'tier' ? null : sort });
  }
}
