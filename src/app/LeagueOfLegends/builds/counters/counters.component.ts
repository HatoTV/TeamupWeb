import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, Scroll } from '@angular/router';
import { filter, take } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { BuildDataService, ChampionBuild, CounterStat, StaticCore } from '../../../core/data/build-data.service';
import { Champion, ChampionDataService, ChampionMatchups } from '../../../core/data/champion-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { DifficultyIconComponent } from '../../../shared/ui/difficulty/difficulty-icon.component';
import { DifficultyLevel, difficulty } from '../../../shared/ui/difficulty/matchup-difficulty';
import { CommunityTipsComponent } from '../../matchups/community-tips/community-tips.component';
import { injectIsMobile, rankId, splitTips } from '../../matchups/matchups-data';
import { formatInt, formatRate } from '../build-utils';
import { MIN_COUNTER_GAMES, counterColumns, gapWidth, levelFromWinRate, mostPlayed } from './counters-utils';

type Side = 'good' | 'bad';

interface CounterRow extends CounterStat {
  /** `?vs=` value: the site slug of the opponent. */
  id: string;
  side: Side;
  name: string;
  icon: string;
  /** Site champion (matchup tips, community tips), null when the index does not know it. */
  champion: Champion | null;
  width: number;
}

interface Column {
  side: Side;
  titleKey: string;
  rows: CounterRow[];
}

/**
 * « Counters » tab of the champion page: lane opponents the champion beats (« Advantage ») and those that beat him
 * (« Counter »), scrolling with the page, and the selected matchup in a sticky panel on the right (`?vs={slug}`): stats,
 * TeamUpp matchup tips, then the community tips.
 */
@Component({
  selector: 'app-counters',
  standalone: true,
  imports: [TranslateModule, CommunityTipsComponent, DifficultyIconComponent],
  templateUrl: './counters.component.html',
  styleUrl: './counters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountersComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly builds = inject(BuildDataService);
  private readonly champions = inject(ChampionDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly champion = input.required<Champion>();
  readonly file = input.required<ChampionBuild>();
  readonly core = input<StaticCore | null>(null);
  readonly version = input<string | null>(null);

  protected readonly minGames = MIN_COUNTER_GAMES;
  protected readonly isMobile = injectIsMobile();
  /** Column shown under 768 px. */
  protected readonly mobileSide = signal<Side>('good');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly query = toSignal(this.route.queryParamMap);
  protected readonly fmtRate = (v: number) => formatRate(v, this.ctx.lang());
  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());

  protected readonly columns = computed<Column[]>(() => {
    const { advantage, counter } = counterColumns(this.file());
    return [
      { side: 'good', titleKey: 'COUNTERS.ADVANTAGE', rows: advantage.map((o) => this.row(o, 'good')).filter((r): r is CounterRow => !!r) },
      { side: 'bad', titleKey: 'COUNTERS.COUNTER', rows: counter.map((o) => this.row(o, 'bad')).filter((r): r is CounterRow => !!r) },
    ];
  });
  private readonly allRows = computed(() => this.columns().flatMap((c) => c.rows));
  protected readonly quick = computed(() => mostPlayed(this.allRows()));

  /** Selected opponent from `?vs=`; an unknown value is ignored. */
  protected readonly selected = computed<CounterRow | null>(() => {
    const vs = this.query()?.get('vs')?.toLowerCase();
    return (vs && this.allRows().find((r) => r.id === vs)) || null;
  });

  /** TeamUpp matchup file of the page champion: undefined while loading. */
  private readonly matchups = signal<ChampionMatchups | null | undefined>(undefined);
  private readonly matchup = computed(() => {
    const vs = this.selected()?.champion?.name;
    return (vs && this.matchups()?.matchups.find((m) => m.enemy === vs)) || null;
  });

  protected readonly level = computed<DifficultyLevel | null>(() => {
    const s = this.selected();
    if (!s) return null;
    const m = this.matchup();
    return m ? difficulty(m.level).level : levelFromWinRate(s.winRate);
  });
  protected readonly levelInfo = computed(() => {
    const level = this.level();
    return level ? difficulty(level) : null;
  });

  protected readonly tips = computed(() => {
    const m = this.matchup();
    if (!m) return null;
    const useFrench = this.ctx.lang() === 'fr' && !!m.tipsFr;
    const lines = splitTips(useFrench ? m.tipsFr! : m.tips);
    return lines.length ? { lines, lang: useFrench ? 'fr' : 'en', englishFallback: this.ctx.lang() === 'fr' && !useFrench } : null;
  });

  protected readonly author = computed(() => {
    const data = this.matchups();
    return this.tips() && data?.author ? { name: data.author, rank: rankId(data.rank) } : null;
  });

  constructor() {
    effect(() => {
      const champion = this.champion();
      untracked(() => {
        this.matchups.set(undefined);
        if (!champion.hasMatchups) this.matchups.set(null);
        else void this.champions.loadMatchups(champion.slug).then((data) => this.champion().slug === champion.slug && this.matchups.set(data));
      });
    });
    // A new opponent starts at the top of the panel; the mobile list shows the column of the selection.
    effect(() => {
      const s = this.selected();
      const panel = this.panel()?.nativeElement;
      if (panel) panel.scrollTop = 0;
      if (s) untracked(() => this.mobileSide.set(s.side));
    });
  }

  private row(o: CounterStat, side: Side): CounterRow | null {
    const info = this.core()?.champions[o.championId];
    if (!info) return null;
    const champion = this.champions.index()?.champions.find((c) => c.ddragonId === info.id) ?? null;
    const v = this.version();
    return {
      ...o,
      id: champion?.slug ?? info.id.toLowerCase(),
      side,
      name: info.name,
      icon: v ? this.builds.championIcon(v, info.id) : '',
      champion,
      width: gapWidth(o.winRate),
    };
  }

  protected championIcon(): string {
    const id = this.champion().ddragonId;
    const v = this.version();
    return id && v ? this.builds.championIcon(v, id) : '';
  }

  protected gold(value: number): string {
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${this.fmtInt(Math.abs(value))}`;
  }

  protected select(row: CounterRow | null): void {
    // The router scroll restoration sends the page back to the top on each navigation: picking an opponent keeps the
    // page where it was instead (restored in a microtask, after the router scroll and before the next paint).
    const position = this.scroller.getScrollPosition();
    void this.router.navigate([], { relativeTo: this.route, queryParams: { vs: row?.id ?? null }, queryParamsHandling: 'merge', replaceUrl: true }).then((done) => {
      if (!done) return;
      this.router.events
        .pipe(
          filter((e) => e instanceof Scroll),
          take(1),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => queueMicrotask(() => this.scroller.scrollToPosition(position)));
    });
  }

  /** Roving focus: the selected option (else the first one) is the tab stop of its list. */
  protected tabStop(column: Column, row: CounterRow, index: number): number {
    const selected = this.selected();
    const inColumn = !!selected && column.rows.some((r) => r.id === selected.id);
    return (inColumn ? row.id === selected!.id : index === 0) ? 0 : -1;
  }

  /** Arrows, Home and End move the focus in the list; Enter and Space select. */
  protected onListKey(event: KeyboardEvent, column: Column): void {
    const options = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="option"]'));
    const current = options.indexOf(document.activeElement as HTMLElement);
    const last = options.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = Math.min(last, current + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, current - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if ((event.key === 'Enter' || event.key === ' ') && current >= 0) {
      event.preventDefault();
      this.select(column.rows[current] ?? null);
      return;
    }
    if (next === null || !options.length) return;
    event.preventDefault();
    options[next]!.focus();
  }

  protected back(): void {
    const id = this.selected()?.id;
    this.select(null);
    // Back on the list, on the opponent that was open.
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus());
  }
}
