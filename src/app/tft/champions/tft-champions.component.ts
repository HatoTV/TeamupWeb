import { ChangeDetectionStrategy, Component, ElementRef, computed, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PatchSelectComponent } from '../../LeagueOfLegends/builds/patch-select.component';
import { RankSelectComponent } from '../../LeagueOfLegends/builds/rank-select.component';
import { TierTileComponent } from '../../LeagueOfLegends/tier-list/tier-tile.component';
import { injectPageSeo } from '../../core/seo.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { TftChampion, TftChampionStats } from '../logic/tft-types';
import { fold } from '../tft-data.service';
import { TftStatsPage } from '../tft-page';
import { TftChampComponent, TftItemComponent, costColor } from '../ui/tft-ui.components';

const COSTS = [1, 2, 3, 4, 5] as const;
/** Base statistics shown, in order. */
const STAT_KEYS = ['hp', 'damage', 'armor', 'magicResist', 'attackSpeed', 'range'] as const;

/** `/:lang/tft/champions[/:slug]?cost=&trait=&q=&rank=&patch=`: champions by cost and the selected one's details. */
@Component({
  selector: 'app-tft-champions',
  standalone: true,
  imports: [TranslateModule, RouterLink, RankSelectComponent, PatchSelectComponent, TierTileComponent, IconComponent, TftChampComponent, TftItemComponent],
  templateUrl: './tft-champions.component.html',
  styleUrls: ['../tft-page.scss', './tft-champions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftChampionsComponent extends TftStatsPage {
  protected readonly costs = COSTS;
  protected readonly statKeys = STAT_KEYS;
  protected readonly costColor = costColor;
  private readonly params = toSignal(this.route.paramMap);
  private readonly slug = computed(() => this.params()?.get('slug') ?? null);
  protected readonly cost = computed(() => {
    const c = Number(this.query()?.get('cost'));
    return COSTS.includes(c as (typeof COSTS)[number]) ? c : null;
  });
  protected readonly trait = computed(() => this.query()?.get('trait') ?? null);
  protected readonly search = computed(() => this.query()?.get('q') ?? '');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly statsById = computed(() => new Map((this.stats()?.champions ?? []).map((c) => [c.id, c])));

  /** Traits of the set that champions have, by name (filter options). */
  protected readonly traitOptions = computed(() =>
    [...(this.catalog()?.traits ?? [])].filter((t) => this.catalog()!.listed.some((c) => c.traits.includes(t.id))).sort((a, b) => a.name.localeCompare(b.name))
  );

  /** Champions grouped by cost, best average place first within a cost. */
  protected readonly groups = computed(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const q = fold(this.search().trim());
    const byId = this.statsById();
    const champs = catalog.listed.filter(
      (c) => (!this.cost() || c.cost === this.cost()) && (!this.trait() || c.traits.includes(this.trait()!)) && (!q || fold(c.name).includes(q))
    );
    return COSTS.map((cost) => ({
      cost,
      champions: champs
        .filter((c) => c.cost === cost)
        .map((c) => ({ champion: c, stats: byId.get(c.id) ?? null }))
        .sort((a, b) => (a.stats && b.stats ? a.stats.avg - b.stats.avg : a.stats ? -1 : b.stats ? 1 : a.champion.name.localeCompare(b.champion.name))),
    })).filter((g) => g.champions.length);
  });

  /** Selected champion (`:slug`), or the best one of the list. */
  protected readonly selected = computed<{ champion: TftChampion; stats: TftChampionStats | null } | null>(() => {
    const catalog = this.catalog();
    if (!catalog) return null;
    const slug = this.slug();
    const champion = slug ? catalog.championBySlug(slug) : this.groups()[0]?.champions[0]?.champion;
    return champion ? { champion, stats: this.statsById().get(champion.id) ?? null } : null;
  });

  /** Traits of the selected champion with their breakpoints. */
  protected readonly selectedTraits = computed(() => {
    const catalog = this.catalog();
    return (this.selected()?.champion.traits ?? []).flatMap((id) => {
      const t = catalog?.trait(id);
      return t ? [{ id: t.id, name: t.name, icon: t.icon, breakpoints: t.breakpoints.map((b) => b.min).join(' / ') }] : [];
    });
  });

  /** Ability text split in paragraphs. */
  protected readonly abilityParagraphs = computed(() => (this.selected()?.champion.ability.desc ?? '').split(/\n+/).filter(Boolean));

  constructor() {
    super();
    injectPageSeo(() => {
      const champion = this.slug() ? this.selected()?.champion : null;
      const params = { set: this.set() ?? '', patch: this.patch() ?? '', name: champion?.name ?? '' };
      return champion
        ? { titleKey: 'TFTDATA.SEO.CHAMPION_TITLE', descriptionKey: 'TFTDATA.SEO.CHAMPION_DESC', params, image: champion.icon ?? undefined }
        : { titleKey: 'TFTDATA.SEO.CHAMPIONS_TITLE', descriptionKey: 'TFTDATA.SEO.CHAMPIONS_DESC', params, image: '/assets/img/site/bkgContent_Tft.webp' };
    });
  }

  protected link(c: TftChampion): string[] {
    return [this.ctx.link(`/tft/champions/${c.slug}`)];
  }

  protected setSearch(value: string): void {
    this.setQuery({ q: value.trim() ? value : null });
  }

  protected statValue(c: TftChampion, key: (typeof STAT_KEYS)[number]): string {
    const v = c.stats[key];
    if (v === null || v === undefined) return '—';
    if (key === 'attackSpeed') return this.ctx.lang() === 'fr' ? v.toFixed(2).replace('.', ',') : v.toFixed(2);
    return String(v);
  }

  protected manaShare(c: TftChampion): number {
    const max = c.stats.mana ?? 0;
    return max > 0 ? Math.min(100, Math.round(((c.stats.initialMana ?? 0) / max) * 100)) : 0;
  }

  protected reveal(): void {
    if (typeof window === 'undefined' || window.innerWidth >= 1200) return;
    setTimeout(() => this.panel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  protected scrollToList(): void {
    if (typeof document !== 'undefined') document.getElementById('champions-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
