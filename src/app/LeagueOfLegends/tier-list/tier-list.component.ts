import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BuildDataService, BuildMeta, StaticCore, TierList, TierRank } from '../../core/data/build-data.service';
import { ChampionDataService, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { injectPageSeo } from '../../core/seo.service';
import { ROLE_ORDER, formatInt, formatRate } from '../builds/build-utils';
import {
  BAND_BUILD_FILTER,
  BAND_EMBLEMS,
  MIN_RANKED,
  RANK_BANDS,
  RankBand,
  TIER_COLORS,
  bestWinRate,
  UNRANKED_SHOWN_SHARE,
  WinTone,
  groupByTier,
  parseBand,
  parseRole,
  winTone,
  withAlpha,
} from './tier-list-utils';

interface ChampionCell {
  key: number;
  name: string;
  icon: string;
  link: string[] | null;
  tier: TierRank;
  winRate: number;
  pickRate: number;
  games: number;
  tone: WinTone;
}

/** `/:lang/lol/tier-list?rank=low|mid|elite&role=top|jungle|mid|adc|support`: tiers of the patch by rank band and role. */
@Component({
  selector: 'app-tier-list',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  templateUrl: './tier-list.component.html',
  styleUrl: './tier-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierListComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly data = inject(BuildDataService);
  private readonly champions = inject(ChampionDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly bands = RANK_BANDS;
  protected readonly roles = ROLE_ORDER;
  protected readonly emblems = BAND_EMBLEMS;
  protected readonly fmtRate = (v: number) => formatRate(v, this.ctx.lang());
  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());

  private readonly query = toSignal(this.route.queryParamMap);
  protected readonly band = computed(() => parseBand(this.query()?.get('rank')));
  protected readonly role = computed(() => parseRole(this.query()?.get('role')));

  protected readonly open = signal(false);
  private readonly rankButton = viewChild<ElementRef<HTMLButtonElement>>('rankButton');
  private readonly rankList = viewChild<ElementRef<HTMLElement>>('rankList');

  protected readonly meta = signal<BuildMeta | null | undefined>(undefined);
  /** Tier list shown: newest patch, or the previous one while the newest lacks games for the selection. */
  protected readonly file = signal<TierList | null>(null);
  protected readonly core = signal<StaticCore | null>(null);
  protected readonly loading = signal(true);

  protected readonly patch = computed(() => this.file()?.patch ?? this.meta()?.latest ?? null);
  private readonly version = computed(() => this.meta()?.patches.find((p) => p.patch === this.patch())?.ddragonVersion ?? this.meta()?.patches[0]?.ddragonVersion ?? null);

  protected readonly ranked = computed<ChampionCell[]>(() => {
    const file = this.file();
    if (!file || !this.core()) return [];
    return file.champions
      .filter((c) => c.role === this.role())
      .map((c) => ({ ...this.identity(c.championId), tier: c.tier, winRate: c.winRate, pickRate: c.pickRate, games: c.games, tone: winTone(c.winRate) }));
  });
  protected readonly tiers = computed(() =>
    groupByTier(this.ranked()).map((g) => ({ ...g, color: TIER_COLORS[g.tier], bg: withAlpha(TIER_COLORS[g.tier], 0.08), ring: withAlpha(TIER_COLORS[g.tier], 0.6) }))
  );
  protected readonly unranked = computed(() => {
    const file = this.file();
    if (!file || !this.core()) return [];
    // Occasional off-role picks (fewer than a tenth of the threshold) are left out: the file keeps them all.
    const min = file.minGames * UNRANKED_SHOWN_SHARE;
    return file.unranked.filter((c) => c.role === this.role() && c.games >= min).map((c) => ({ ...this.identity(c.championId), games: c.games }));
  });
  protected readonly best = computed(() => bestWinRate(this.ranked()));
  /** Same ring as the champion's icon in its tier row. */
  protected readonly bestRing = computed(() => { const b = this.best(); return b ? withAlpha(TIER_COLORS[b.tier], 0.6) : null; });
  protected readonly enough = computed(() => this.ranked().length >= MIN_RANKED);
  /** Rank filter of the build page links (Master → Challenger only: builds start at Emerald). */
  protected readonly buildQuery = computed(() => {
    const filter = BAND_BUILD_FILTER[this.band()];
    return filter ? { rank: filter } : {};
  });

  constructor() {
    injectPageSeo(() => ({ titleKey: 'TIERLIST.SEO_TITLE', descriptionKey: 'TIERLIST.SEO_DESC', params: { patch: this.patch() ?? '' } }));
    void this.champions.loadIndex().catch(() => undefined);
    effect(() => {
      const band = this.band();
      const role = this.role();
      const lang = this.ctx.lang();
      untracked(() => void this.load(band, role, lang));
    });
  }

  private loadSeq = 0;

  private async load(band: RankBand, role: Role, lang: 'fr' | 'en'): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    const meta = await this.data.meta();
    let file: TierList | null = null;
    // Newest patch first; the previous one while the newest has too few ranked champions in this role.
    for (const p of meta?.patches ?? []) {
      const candidate = await this.data.tierList(p.patch, band);
      if (!candidate) continue;
      file ??= candidate;
      if (candidate.champions.filter((c) => c.role === role).length >= MIN_RANKED) {
        file = candidate;
        break;
      }
    }
    const version = meta?.patches.find((p) => p.patch === file?.patch)?.ddragonVersion ?? meta?.patches[0]?.ddragonVersion;
    const core = version ? await this.data.core(version, lang) : null;
    if (seq !== this.loadSeq) return;
    this.meta.set(meta);
    this.file.set(file);
    this.core.set(core);
    this.loading.set(false);
  }

  private identity(key: number): { key: number; name: string; icon: string; link: string[] | null } {
    const info = this.core()?.champions[key];
    const version = this.version();
    const slug = info ? this.champions.index()?.champions.find((c) => c.ddragonId === info.id)?.slug : undefined;
    return {
      key,
      name: info?.name ?? String(key),
      icon: info && version ? this.data.championIcon(version, info.id) : '',
      link: slug ? [this.ctx.link(`/lol/champions/${slug}/build/${this.role()}`)] : null,
    };
  }

  // ---------- selection (URL query) ----------

  private setQuery(params: { rank?: RankBand; role?: Role }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { rank: params.rank ?? this.band(), role: params.role ?? this.role() },
      replaceUrl: true,
    });
  }

  protected selectRole(role: Role): void {
    if (role !== this.role()) this.setQuery({ role });
  }

  protected selectBand(band: RankBand): void {
    this.close(true);
    if (band !== this.band()) this.setQuery({ rank: band });
  }

  // ---------- rank listbox ----------

  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.openList();
  }

  private openList(): void {
    this.open.set(true);
    // Render the list now, then focus the selected option.
    this.cdr.detectChanges();
    this.focusOption(this.bands.indexOf(this.band()));
  }

  private close(focusButton: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (focusButton) this.rankButton()?.nativeElement.focus();
  }

  private options(): HTMLElement[] {
    return Array.from(this.rankList()?.nativeElement.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
  }

  private focusOption(index: number): void {
    const options = this.options();
    options[(index + options.length) % options.length]?.focus();
  }

  protected onButtonKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openList();
    }
  }

  protected onListKey(event: KeyboardEvent): void {
    const options = this.options();
    const current = options.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusOption(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusOption(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusOption(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (current >= 0) this.selectBand(this.bands[current]!);
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  /** Click outside the rank menu closes it. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const menu = this.host.nativeElement.querySelector('.rank');
    if (this.open() && menu && !menu.contains(event.target as Node)) this.close(false);
  }
}
