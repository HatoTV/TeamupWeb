import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BuildDataService, BuildFilter, BuildMeta, BUILD_FILTERS, ChampionBuild, ChampionStatic, SlotItem, StaticCore, StaticRune } from '../../core/data/build-data.service';
import { Champion, ChampionDataService, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { injectPageSeo } from '../../core/seo.service';
import { AbilityKeyPipe } from '../../shared/i18n/ability-key';
import { BuildMatchupsComponent, MatchupCard } from './build-matchups.component';
import { CountersComponent } from './counters/counters.component';
import { PlayTipsComponent } from './play-tips/play-tips.component';
import { GameIconComponent } from '../../shared/ui/game-icon.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SHARD_ROWS, SKILL_COLORS, ROLE_ORDER, buildIndexFrom, formatDelta, formatInt, formatRate, groupItems, isBuildFilter, rankFilters, treeColor } from './build-utils';
import { RankSelectComponent } from './rank-select.component';
import { RegionSelectComponent } from './region-select.component';
import { TierTileComponent } from '../tier-list/tier-tile.component';
import { SkillOrderComponent } from './skill-order/skill-order.component';

type State = 'loading' | 'not-found' | 'insufficient' | 'ready';

/** Item of the build line: a core item, a next item or the boots (share, win rate, alternatives). */
interface LineItem {
  item: number;
  stat: SlotItem | null;
  alternatives: SlotItem[];
}

/**
 * Champion page: `/:lang/lol/champions/:championId/build/:role?rank&region&patch&build` (« Build » tab) and
 * `/:lang/lol/champions/:championId/counters/:role?vs` (« Counters » tab, same filters as the build tab, no filter bar).
 */
@Component({
  selector: 'app-build-page',
  standalone: true,
  imports: [TierTileComponent, SkillOrderComponent, TranslateModule, RouterLink, NgTemplateOutlet, RankSelectComponent, RegionSelectComponent, GameIconComponent, IconComponent, AbilityKeyPipe, BuildMatchupsComponent, PlayTipsComponent, CountersComponent],
  templateUrl: './build-page.component.html',
  styleUrl: './build-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildPageComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly data = inject(BuildDataService);
  private readonly champions = inject(ChampionDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly roleOrder = ROLE_ORDER;
  protected readonly shardRows = SHARD_ROWS;
  protected readonly skillColors = SKILL_COLORS;
  protected readonly fmtRate = (v: number, digits = 1) => formatRate(v, this.ctx.lang(), digits);
  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());
  protected readonly fmtDelta = (v: number) => formatDelta(v, this.ctx.lang());
  protected readonly group = groupItems;

  private readonly params = toSignal(this.route.paramMap);
  private readonly query = toSignal(this.route.queryParamMap);
  private readonly routeData = toSignal(this.route.data);
  protected readonly tab = computed<'build' | 'counters'>(() => (this.routeData()?.['tab'] === 'counters' ? 'counters' : 'build'));
  /** `?patch=`, as its own signal: other query parameters (`?vs=`, `?build=`) do not reload the data. */
  private readonly patchParam = computed(() => this.query()?.get('patch') ?? null);

  protected readonly champion = computed<Champion | null>(() => {
    const slug = this.params()?.get('championId');
    return this.champions.index()?.champions.find((c) => c.slug === slug) ?? null;
  });
  protected readonly role = computed(() => (this.params()?.get('role') ?? '') as Role);
  /** Rank filters with games of their own tier; the widest one is the default. */
  protected readonly filters = computed<BuildFilter[]>(() => {
    const list = rankFilters(this.meta(), this.query()?.get('patch'), this.region());
    return list.length ? list : [BUILD_FILTERS[0]];
  });
  protected readonly defaultFilter = computed(() => this.filters()[0]!);
  protected readonly filter = computed<BuildFilter>(() => {
    const rank = this.query()?.get('rank');
    return isBuildFilter(rank, this.filters()) ? rank : this.defaultFilter();
  });
  protected readonly region = computed(() => this.query()?.get('region') ?? 'all');
  /** `?build=0..3`; an unknown value (old links included) selects build 0. */
  protected readonly buildIndex = computed(() => buildIndexFrom(this.query()?.get('build'), this.file()?.builds.length ?? 0));

  /** `undefined` until meta.json is loaded (the rank filters depend on it). */
  protected readonly meta = signal<BuildMeta | null | undefined>(undefined);
  protected readonly file = signal<ChampionBuild | null>(null);
  /** Newest patch, when the page falls back to the previous one (not enough games yet). */
  protected readonly fallbackFrom = signal<string | null>(null);
  protected readonly availableRoles = signal<Role[]>([]);
  protected readonly core = signal<StaticCore | null>(null);
  protected readonly champStatic = signal<ChampionStatic | null>(null);
  protected readonly state = signal<State>('loading');
  /** Browser clock for "updated … ago" (null during prerendering). */
  protected readonly now = signal<number | null>(null);

  protected readonly patch = computed(() => this.file()?.patch ?? null);
  protected readonly version = computed(() => this.meta()?.patches.find((p) => p.patch === this.patch())?.ddragonVersion ?? null);
  /** Data Dragon version of the loaded static data, also when the page has no build (not enough games). */
  protected readonly staticVersion = computed(() => this.version() ?? this.meta()?.patches[0]?.ddragonVersion ?? null);
  protected readonly build = computed(() => this.file()?.builds[this.buildIndex()] ?? null);

  /**
   * Item line: the two core items (purchase order) then the most played next items, each with its alternatives,
   * the boots at their purchase position (`boots.slot`; after the core items in files without it).
   */
  protected readonly itemLine = computed<LineItem[] | null>(() => {
    const b = this.build();
    if (!b) return null;
    const core: LineItem[] = b.core.map((id) => ({ item: id, stat: null, alternatives: [] }));
    const next: LineItem[] = b.next.map((s) => ({ item: s.item, stat: s, alternatives: s.alternatives }));
    const items = [...core, ...next];
    if (b.boots) {
      const boots: LineItem = { item: b.boots.item, stat: b.boots, alternatives: b.boots.alternatives ?? [] };
      // Older files: the boots may be one of the core items.
      const inCore = items.findIndex((it) => it.item === boots.item);
      if (inCore >= 0) items[inCore] = boots;
      else items.splice(Math.min((b.boots.slot ?? core.length + 1) - 1, items.length), 0, boots);
    }
    return items.slice(0, 7);
  });

  protected readonly ddragonId = computed(() => this.champion()?.ddragonId ?? null);
  protected readonly championName = computed(() => this.champion()?.name ?? '');
  protected readonly roleName = computed(() => {
    this.ctx.lang();
    return this.translate.instant(`PICKERPAGE.ROLES.${this.role()}`) as string;
  });

  protected readonly abilities = computed(() => {
    const s = this.champStatic();
    const v = this.version();
    if (!s || !v) return [];
    return [
      { key: 'P', slot: null, name: s.passive.name, desc: s.passive.desc, src: this.data.passiveIcon(v, s.passive.icon) },
      ...s.spells.map((sp, i) => ({ key: '', slot: (i + 1) as 1 | 2 | 3 | 4, name: sp.name, desc: sp.desc, src: this.data.spellIcon(v, sp.icon) })),
    ];
  });

  protected readonly runeTrees = computed(() => {
    const page = this.build()?.runes?.page;
    const core = this.core();
    if (!page || !core) return null;
    const selected = new Set(page);
    const tree = (id: number) => core.runeTrees.find((t) => t.id === id);
    const primary = tree(page[0]!);
    const secondary = tree(page[5]!);
    // Every rune of both trees in the client layout; the chosen ones are in colour.
    return {
      primary: primary && { ...primary, color: treeColor(primary.id), rows: primary.slots.map((row) => row.map((r) => ({ ...r, on: selected.has(r.id) }))) },
      // The secondary tree has no keystone row.
      secondary: secondary && { ...secondary, color: treeColor(secondary.id), rows: secondary.slots.slice(1).map((row) => row.map((r) => ({ ...r, on: selected.has(r.id) }))) },
      keystone: primary?.slots[0]?.find((r) => r.id === page[1])?.name ?? null,
      shards: this.shardRows.map((row, i) => row.map((id) => ({ id, on: page[8 + i] === id, info: core.shards[id] }))),
    };
  });

  protected readonly muGroups = computed<MatchupCard[]>(() => {
    const f = this.file();
    if (!f || !this.core()) return [];
    const role = this.role();
    const card = (o: { champion: number; winRate: number }, r: Role) => ({
      key: o.champion,
      name: this.championNameByKey(o.champion),
      icon: this.championIcon(o.champion),
      winRate: this.fmtRate(o.winRate),
      link: this.championLink(o.champion, r),
    });
    return [
      { title: 'BUILDS.WEAK_AGAINST', tone: 'bad', items: f.weakAgainst.map((o) => card(o, role)) },
      { title: 'BUILDS.STRONG_AGAINST', tone: 'good', items: f.strongAgainst.map((o) => card(o, role)) },
      { title: 'BUILDS.SYNERGY', tone: 'duo', items: f.synergy.map((o) => card(o, o.role)) },
    ];
  });

  protected readonly updatedAgo = computed(() => {
    const now = this.now();
    const updated = this.meta()?.patches.find((p) => p.patch === this.patch())?.updatedAt;
    if (!now || !updated) return null;
    const hours = Math.max(0, Math.round((now - Date.parse(updated)) / 3_600_000));
    return hours < 1 ? this.translate.instant('BUILDS.UPDATED_NOW') : this.translate.instant(hours < 48 ? 'BUILDS.UPDATED_HOURS' : 'BUILDS.UPDATED_DAYS', { n: hours < 48 ? hours : Math.round(hours / 24) });
  });

  constructor() {
    injectPageSeo(() => {
      const champion = this.championName();
      if (!champion) return null;
      const counters = this.tab() === 'counters';
      return {
        titleKey: counters ? 'COUNTERS.SEO_TITLE' : 'BUILDS.SEO_TITLE',
        descriptionKey: counters ? 'COUNTERS.SEO_DESC' : 'BUILDS.SEO_DESC',
        params: { champion, role: this.roleName(), patch: this.patch() ?? this.meta()?.latest ?? '' },
      };
    });
    void this.champions.loadIndex().catch(() => undefined);
    void this.data.meta().then((meta) => this.meta.set(meta));
    afterNextRender(() => this.now.set(Date.now()));

    effect(() => {
      const champion = this.champion();
      const role = this.role();
      const filter = this.filter();
      const region = this.region();
      const patch = this.patchParam();
      const indexLoaded = !!this.champions.index() && this.meta() !== undefined;
      this.ctx.lang(); // localised static data
      untracked(() => void this.load(champion, role, filter, region, patch, indexLoaded));
    });
  }

  private championNameByKey(key: number): string {
    return this.core()?.champions[key]?.name ?? String(key);
  }

  protected championIcon(key: number): string {
    const id = this.core()?.champions[key]?.id;
    const v = this.version();
    return id && v ? this.data.championIcon(v, id) : '';
  }

  protected championLink(key: number, role: Role): string[] | null {
    const ddragonId = this.core()?.champions[key]?.id;
    const slug = this.champions.index()?.champions.find((c) => c.ddragonId === ddragonId)?.slug;
    return slug ? [this.ctx.link(`/lol/champions/${slug}/build/${role}`)] : null;
  }

  protected item(id: number): { name: string; desc: string; cost: number; src: string } {
    const info = this.core()?.items[id];
    return { name: info?.name ?? String(id), desc: info?.desc ?? '', cost: info?.cost ?? 0, src: this.data.itemIcon(this.version() ?? '', id) };
  }

  protected spell(key: number): { name: string; desc: string; src: string } {
    const info = this.core()?.summoners[key];
    return { name: info?.name ?? String(key), desc: info?.desc ?? '', src: info ? this.data.spellIcon(this.version() ?? '', info.icon) : '' };
  }

  /** Rune (keystone…) by id, from the localised Data Dragon trees. */
  protected rune(id: number): StaticRune | null {
    for (const t of this.core()?.runeTrees ?? []) for (const row of t.slots) for (const r of row) if (r.id === id) return r;
    return null;
  }

  protected tree(id: number): { name: string; icon: string } | null {
    return this.core()?.runeTrees.find((t) => t.id === id) ?? null;
  }

  protected selectBuild(index: number): void {
    if (index !== this.buildIndex()) this.setQuery({ build: index || null });
  }

  /** Listbox keyboard: arrows (both axes, the list is a carousel on mobile), Home and End move the selection. */
  protected onBuildKey(event: KeyboardEvent): void {
    const count = this.file()?.builds.length ?? 0;
    const current = this.buildIndex();
    const next =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? Math.min(count - 1, current + 1)
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null;
    if (next === null || count === 0) return;
    event.preventDefault();
    this.selectBuild(next);
    this.host.nativeElement.querySelector<HTMLElement>(`#build-${next}`)?.focus();
  }

  protected setQuery(params: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected selectRole(role: Role): void {
    const slug = this.champion()?.slug;
    if (slug && role !== this.role()) void this.router.navigate([this.ctx.link(`/lol/champions/${slug}/build/${role}`)], { queryParamsHandling: 'preserve' });
  }

  /** Link of a tab of the champion page, same role and filters. */
  protected tabLink(tab: 'build' | 'counters'): string {
    return this.ctx.link(`/lol/champions/${this.champion()?.slug ?? ''}/${tab}/${this.role()}`);
  }

  /** Incremented on each load: only the latest one may update the page. */
  private loadSeq = 0;

  private async load(champion: Champion | null, role: Role, filter: BuildFilter, region: string, patch: string | null, indexLoaded: boolean): Promise<void> {
    if (!indexLoaded) return;
    const seq = ++this.loadSeq;
    if (!champion?.ddragonId || !ROLE_ORDER.includes(role)) {
      this.state.set('not-found');
      return;
    }
    this.state.set('loading');
    const meta = await this.data.meta();
    this.meta.set(meta);
    if (!meta) {
      this.state.set('insufficient');
      return;
    }
    const patches = meta.patches.map((p) => p.patch);
    const wanted = patch && patches.includes(patch) ? patch : meta.latest;
    let file = await this.data.build(wanted, filter, champion.ddragonId, role, region);
    let fallbackFrom: string | null = null;
    const previous = patches.find((p) => p !== wanted);
    if (!patch && previous && (!file || file.games < meta.minGamesForNewPatch)) {
      const older = await this.data.build(previous, filter, champion.ddragonId, role, region);
      if (older && (!file || older.games > file.games)) {
        file = older;
        fallbackFrom = wanted;
      }
    }
    // Roles available for this champion in the shown patch / filter.
    const index = await this.data.index(file?.patch ?? wanted, filter, region);
    const key = Object.entries((await this.data.core(meta.patches[0]!.ddragonVersion, this.ctx.lang()))?.champions ?? {}).find(([, c]) => c.id === champion.ddragonId)?.[0];

    if (seq !== this.loadSeq) return; // a newer navigation or filter change won
    this.availableRoles.set(index?.champions.find((c) => String(c.champion) === key)?.roles.map((r) => r.role) ?? []);
    this.file.set(file);
    this.fallbackFrom.set(fallbackFrom);
    // Static data is loaded even without enough games: the « Tips pour jouer » block does not depend on the stats.
    const version = meta.patches.find((p) => p.patch === file?.patch)?.ddragonVersion ?? meta.patches[0]!.ddragonVersion;
    const [core, champ] = await Promise.all([this.data.core(version, this.ctx.lang()), this.data.champion(version, this.ctx.lang(), champion.ddragonId)]);
    if (seq !== this.loadSeq) return;
    this.core.set(core);
    this.champStatic.set(champ);
    this.state.set(!file || !file.builds.length ? 'insufficient' : 'ready');
  }
}
