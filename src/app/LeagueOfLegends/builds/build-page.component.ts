import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BuildDataService, BuildFilter, BuildMeta, BUILD_FILTERS, ChampionBuild, ChampionStatic, StaticCore } from '../../core/data/build-data.service';
import { Champion, ChampionDataService, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { injectPageSeo } from '../../core/seo.service';
import { AbilityKeyPipe, abilityKey } from '../../shared/i18n/ability-key';
import { BuildMatchupsComponent, MatchupCard } from './build-matchups.component';
import { PlayTipsComponent } from './play-tips/play-tips.component';
import { GameIconComponent } from '../../shared/ui/game-icon.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SHARD_ROWS, SKILL_COLORS, ROLE_ORDER, buildAsText, formatDelta, formatInt, formatRate, formatTiming, groupItems, isBuildFilter, rankFilters } from './build-utils';

type State = 'loading' | 'not-found' | 'insufficient' | 'ready';

/** Champion build page: `/:lang/lol/champions/:championId/build/:role?rank&region&patch&build`. */
@Component({
  selector: 'app-build-page',
  standalone: true,
  imports: [TranslateModule, RouterLink, GameIconComponent, IconComponent, AbilityKeyPipe, BuildMatchupsComponent, PlayTipsComponent],
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
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly roleOrder = ROLE_ORDER;
  protected readonly shardRows = SHARD_ROWS;
  protected readonly skillColors = SKILL_COLORS;
  protected readonly levels = Array.from({ length: 18 }, (_, i) => i + 1);
  protected readonly fmtRate = (v: number) => formatRate(v, this.ctx.lang());
  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());
  protected readonly fmtDelta = (v: number) => formatDelta(v, this.ctx.lang());
  protected readonly fmtTime = formatTiming;
  protected readonly group = groupItems;

  private readonly params = toSignal(this.route.paramMap);
  private readonly query = toSignal(this.route.queryParamMap);

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
  protected readonly buildIndex = computed(() => Math.min(2, Math.max(0, Number(this.query()?.get('build') ?? 0) || 0)));

  /** `undefined` until meta.json is loaded (the rank filters depend on it). */
  protected readonly meta = signal<BuildMeta | null | undefined>(undefined);
  protected readonly file = signal<ChampionBuild | null>(null);
  /** Newest patch, when the page falls back to the previous one (not enough games yet). */
  protected readonly fallbackFrom = signal<string | null>(null);
  protected readonly availableRoles = signal<Role[]>([]);
  protected readonly core = signal<StaticCore | null>(null);
  protected readonly champStatic = signal<ChampionStatic | null>(null);
  protected readonly state = signal<State>('loading');
  protected readonly copied = signal(false);
  protected readonly situationalIndex = signal(0);
  protected readonly opponentQuery = signal('');
  /** Browser clock for "updated … ago" (null during prerendering). */
  protected readonly now = signal<number | null>(null);

  protected readonly patch = computed(() => this.file()?.patch ?? null);
  protected readonly version = computed(() => this.meta()?.patches.find((p) => p.patch === this.patch())?.ddragonVersion ?? null);
  protected readonly build = computed(() => this.file()?.builds[this.buildIndex()] ?? this.file()?.builds[0] ?? null);

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
    return {
      primary: primary && { ...primary, rows: primary.slots.map((row) => row.map((r) => ({ ...r, on: selected.has(r.id) }))) },
      // The secondary tree has no keystone row.
      secondary: secondary && { ...secondary, rows: secondary.slots.slice(1).map((row) => row.map((r) => ({ ...r, on: selected.has(r.id) }))) },
      shards: this.shardRows.map((row, i) => row.map((id) => ({ id, on: page[8 + i] === id, info: core.shards[id] }))),
    };
  });

  protected readonly skillRows = computed(() => {
    const order = this.build()?.skills?.order ?? '';
    return ['1', '2', '3', '4'].map((slot) => ({ slot: Number(slot) as 1 | 2 | 3 | 4, cells: this.levels.map((_, i) => order[i] === slot) }));
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

  protected readonly situational = computed(() => this.build()?.situational ?? []);
  protected readonly situationalTip = computed(() => {
    const s = this.situational()[this.situationalIndex()];
    if (!s) return null;
    const key = `LOL.ITEM_TIPS.${s.item}`;
    const tip = this.translate.instant(key) as string;
    return tip && tip !== key ? tip : null;
  });

  protected readonly opponents = computed(() => {
    const list = this.file()?.vsOpponent ?? [];
    const q = this.opponentQuery().trim().toLowerCase();
    const named = list.map((o) => ({ ...o, name: this.championNameByKey(o.champion) }));
    return q ? named.filter((o) => o.name.toLowerCase().includes(q)) : named.slice(0, 4);
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
      return {
        titleKey: 'BUILDS.SEO_TITLE',
        descriptionKey: 'BUILDS.SEO_DESC',
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
      const patch = this.query()?.get('patch') ?? null;
      const indexLoaded = !!this.champions.index() && this.meta() !== undefined;
      this.ctx.lang(); // localised static data
      untracked(() => void this.load(champion, role, filter, region, patch, indexLoaded));
    });
    effect(() => {
      this.build();
      untracked(() => {
        this.situationalIndex.set(0);
        this.copied.set(false);
      });
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

  protected keystoneIcon(page: readonly number[]): string {
    const tree = this.core()?.runeTrees.find((t) => t.id === page[0]);
    const keystone = tree?.slots[0]?.find((r) => r.id === page[1]);
    return keystone ? this.data.runeIcon(keystone.icon) : '';
  }

  protected slot(s: string): 1 | 2 | 3 | 4 {
    return Number(s) as 1 | 2 | 3 | 4;
  }

  protected rankIcon(tier: string): string {
    return `assets/img/ranks/${tier.toLowerCase()}.webp`;
  }

  protected maxKeys(): string[] {
    return [...(this.build()?.skills?.max ?? '')].map((s) => abilityKey(Number(s) as 1 | 2 | 3, this.ctx.lang()));
  }

  protected setQuery(params: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected selectRole(role: Role): void {
    const slug = this.champion()?.slug;
    if (slug && role !== this.role()) void this.router.navigate([this.ctx.link(`/lol/champions/${slug}/build/${role}`)], { queryParamsHandling: 'preserve' });
  }

  protected async copyBuild(): Promise<void> {
    const build = this.build();
    const core = this.core();
    if (!build || !core || !this.isBrowser) return;
    const t = (k: string) => this.translate.instant(`BUILDS.COPY.${k}`) as string;
    const title = `${this.championName()} ${this.roleName()} — ${this.translate.instant('BUILDS.PATCH', { patch: this.patch() })} (${this.translate.instant(`BUILDS.FILTERS.${this.filter()}`)})`;
    const text = buildAsText(build, core, this.ctx.lang(), { title, core: t('CORE'), full: t('FULL'), start: t('START'), runes: t('RUNES'), spells: t('SPELLS'), skills: t('SKILLS'), max: t('MAX') });
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
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
    if (!file || !file.builds.length) {
      this.state.set('insufficient');
      return;
    }
    const version = meta.patches.find((p) => p.patch === file!.patch)?.ddragonVersion ?? meta.patches[0]!.ddragonVersion;
    const [core, champ] = await Promise.all([this.data.core(version, this.ctx.lang()), this.data.champion(version, this.ctx.lang(), champion.ddragonId)]);
    if (seq !== this.loadSeq) return;
    this.core.set(core);
    this.champStatic.set(champ);
    this.state.set('ready');
  }
}
