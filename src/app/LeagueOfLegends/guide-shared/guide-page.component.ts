import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, combineLatest, map, startWith, switchMap } from 'rxjs';
import { LOL_GUIDE_GROUPS } from '../../core/navigation/lol-nav';
import { RouteContextService } from '../../core/route-context.service';
import { GuideChapter, GuideLayoutComponent, GuideNavLink, TocEntry } from '../../shared/ui/guide-layout/guide-layout.component';
import { Crumb, HeroTag, PageHeroComponent } from '../../shared/ui/page-hero/page-hero.component';
import { readingMinutes } from './guide-text';

export interface GuideSection {
  id: string;
  titleKey: string;
  level: 1 | 2;
}

export interface GuideConfig {
  /** Id of the group in LOL_GUIDE_GROUPS (drives breadcrumb and prev/next). */
  groupId: string;
  heroImage: string;
  titleKey: string;
  subtitleKey: string;
  /** Translation subtree used to estimate the reading time. */
  i18nRoot: string;
  sections: GuideSection[];
}

/** Shared frame of the LoL guides: hero, chapters, TOC, prev/next; the guide body is projected. */
@Component({
  selector: 'app-guide-page',
  standalone: true,
  imports: [TranslateModule, PageHeroComponent, GuideLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      [image]="config().heroImage"
      [title]="t()[config().titleKey] ?? ''"
      [subtitle]="t()[config().subtitleKey] ?? ''"
      [breadcrumbs]="breadcrumbs()"
      [tags]="tags()"
    />
    <app-guide-layout [chapters]="chapters()" [toc]="toc()" [prev]="prev()" [next]="next()">
      <div class="guide-prose">
        <ng-content />
      </div>
    </app-guide-layout>
  `,
})
export class GuidePageComponent {
  readonly config = input.required<GuideConfig>();

  private readonly translate = inject(TranslateService);
  private readonly ctx = inject(RouteContextService);

  /** Config + language changes (the required input is only readable after the first binding). */
  private readonly trigger$ = combineLatest([
    toObservable(this.config),
    this.translate.onLangChange.pipe(startWith(null)),
  ]);

  /** Translations of every key the frame needs, refreshed on language change. */
  protected readonly t = toSignal(
    this.trigger$.pipe(switchMap(([config]) => this.translate.get(this.keys(config)) as Observable<Record<string, string | undefined>>)),
    { initialValue: {} as Record<string, string | undefined> }
  );

  private readonly readingTime = toSignal(
    this.trigger$.pipe(
      switchMap(([config]) => this.translate.get(config.i18nRoot)),
      map((tree: unknown) => readingMinutes(tree))
    ),
    { initialValue: 0 }
  );

  private readonly groupIndex = computed(() => LOL_GUIDE_GROUPS.findIndex((g) => g.id === this.config().groupId));

  protected readonly chapters = computed<GuideChapter[]>(() =>
    this.config()
      .sections.filter((s) => s.level === 1)
      .map((s) => ({ id: s.id, title: this.t()[s.titleKey] ?? '' }))
  );

  protected readonly toc = computed<TocEntry[]>(() =>
    this.config().sections.map((s) => ({ id: s.id, level: s.level, label: this.t()[s.titleKey] ?? '' }))
  );

  protected readonly breadcrumbs = computed<Crumb[]>(() => [
    { label: this.t()['GAMES.LOL'] ?? '', link: this.ctx.link('/lol/matchups') },
    { label: this.t()['NAV.LOL_GUIDES'] ?? '' },
    { label: this.t()[LOL_GUIDE_GROUPS[this.groupIndex()]?.labelKey ?? ''] ?? '' },
  ]);

  protected readonly tags = computed<HeroTag[]>(() => {
    const t = this.t();
    const minutes = this.readingTime();
    return [
      { label: (t['GUIDES.CHAPTERS_TAG'] ?? '').replace('{{count}}', String(this.chapters().length)), accent: true },
      ...(minutes ? [{ label: (t['GUIDES.READING_TAG'] ?? '').replace('{{minutes}}', String(minutes)) }] : []),
    ];
  });

  protected readonly prev = computed<GuideNavLink | null>(() => this.neighbour(-1));
  protected readonly next = computed<GuideNavLink | null>(() => this.neighbour(1));

  private neighbour(step: number): GuideNavLink | null {
    const group = LOL_GUIDE_GROUPS[this.groupIndex() + step];
    if (!group) return null;
    return { label: this.t()[group.labelKey] ?? '', link: this.ctx.link(group.path) };
  }

  private keys(config: GuideConfig): string[] {
    return [
      config.titleKey,
      config.subtitleKey,
      'GAMES.LOL',
      'NAV.LOL_GUIDES',
      'GUIDES.CHAPTERS_TAG',
      'GUIDES.READING_TAG',
      ...LOL_GUIDE_GROUPS.map((g) => g.labelKey),
      ...config.sections.map((s) => s.titleKey),
    ];
  }
}
