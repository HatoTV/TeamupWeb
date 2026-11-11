import { injectPageSeo } from '../../core/seo.service';
import { ImgFallbackPipe, SrcsetPipe } from '../../core/images/image-utils';
import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Champion, ChampionDataService, ChampionMatchups, MatchupTip } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { slugify } from '../../core/slug';
import { EmailService, MatchupRequestType } from '../../services/email.service';
import { ChampionComboboxComponent, ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { DifficultyBadgeComponent } from '../../shared/ui/difficulty-badge.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';

const RANK_IDS = ['challenger', 'grandmaster', 'master', 'diamond', 'emerald', 'platinum', 'gold', 'silver', 'bronze', 'iron'];
const RANK_ALIASES: Record<string, string> = { diamant: 'diamond' };

interface ListRow {
  name: string;
  icon: string;
  level: number;
  queryParams: { champion: string; enemy: string };
}

interface MatchupList {
  id: string;
  kind: 'favourable' | 'counters';
  owner: ChampionOption;
  rows: ListRow[];
}

type SendState = 'idle' | 'sending' | 'sent' | 'error';

/** Splits a raw tip into sentences (same rules as the previous page, without the dashes). */
export function splitTips(raw: string): string[] {
  return raw
    .replace(/\|\s?/g, '')
    .replace(/(?<!\d)\.\s+/g, '.\n')
    .split('\n')
    .map((line) => line.replace(/^[^\p{L}\p{N}]+/u, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => line.charAt(0).toUpperCase() + line.slice(1));
}

export function rankId(rank: string | null): string | null {
  if (!rank) return null;
  for (const token of rank.toLowerCase().split(/[^a-zé]+/)) {
    const id = RANK_ALIASES[token] ?? token;
    if (RANK_IDS.includes(id)) return id;
  }
  return null;
}

@Component({
  selector: 'app-matchups',
  standalone: true,
  imports: [SrcsetPipe, ImgFallbackPipe, NgOptimizedImage, 
    TranslateModule,
    RouterLink,
    FormsModule,
    ChampionComboboxComponent,
    DifficultyBadgeComponent,
    MeterComponent,
    IconComponent,
  ],
  templateUrl: './matchups.component.html',
  styleUrl: './matchups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupsComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(ChampionDataService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly email = inject(EmailService);

  protected readonly levels = [5, 4, 3, 2, 1];
  private readonly params = toSignal(this.route.queryParamMap);

  protected readonly options = computed<ChampionOption[]>(() =>
    (this.data.index()?.champions ?? []).map((champion) => ({ champion, icon: this.data.iconUrl(champion) }))
  );
  protected readonly ally = computed(() => this.optionFor(this.params()?.get('champion')));
  protected readonly enemy = computed(() => this.optionFor(this.params()?.get('enemy')));

  /** Matchup files of the selected champions (undefined while loading). */
  private readonly allyData = signal<ChampionMatchups | null | undefined>(undefined);
  private readonly enemyData = signal<ChampionMatchups | null | undefined>(undefined);
  protected readonly loading = computed(
    () => (!!this.ally() && this.allyData() === undefined) || (!!this.enemy() && this.enemyData() === undefined)
  );

  protected readonly matchup = computed<MatchupTip | null>(() => {
    const enemy = this.enemy();
    return (enemy && this.allyData()?.matchups.find((m) => m.enemy === enemy.champion.name)) || null;
  });

  protected readonly tips = computed(() => {
    const m = this.matchup();
    if (!m) return null;
    const useFrench = this.ctx.lang() === 'fr' && !!m.tipsFr;
    return {
      lines: splitTips(useFrench ? m.tipsFr! : m.tips),
      lang: useFrench ? 'fr' : 'en',
      englishFallback: this.ctx.lang() === 'fr' && !useFrench,
    };
  });

  protected readonly author = computed(() => {
    const data = this.allyData();
    if (!data?.author) return null;
    return { name: data.author, rank: rankId(data.rank) };
  });

  protected readonly guideUrl = computed(() => {
    const data = this.allyData();
    if (!data) return null;
    return (this.ctx.lang() === 'fr' ? data.urlGuideFr : null) ?? data.urlGuide;
  });

  protected readonly lists = computed<MatchupList[]>(() => {
    const result: MatchupList[] = [];
    for (const [owner, data] of [
      [this.ally(), this.allyData()],
      [this.enemy(), this.enemyData()],
    ] as const) {
      if (!owner || !data) continue;
      result.push(
        { id: `${owner.champion.slug}-favourable`, kind: 'favourable', owner, rows: this.rows(owner.champion, data, [1, 2]) },
        { id: `${owner.champion.slug}-counters`, kind: 'counters', owner, rows: this.rows(owner.champion, data, [5, 4]) }
      );
    }
    return result;
  });

  // Update request form
  protected readonly requestType = signal<MatchupRequestType>('wrong_data');
  protected readonly message = signal('');
  protected readonly website = signal('');
  protected readonly sendState = signal<SendState>('idle');

  constructor() {
    injectPageSeo(() => {
      const a = this.ally()?.champion.name;
      const b = this.enemy()?.champion.name;
      return a && b
        ? { titleKey: 'SEO.MATCHUP_TITLE', descriptionKey: 'SEO.MATCHUP_DESC', params: { a, b }, image: '/assets/img/site/matchup_bkg.webp' }
        : { titleKey: 'SEO.MATCHUPS_TITLE', descriptionKey: 'SEO.MATCHUPS_DESC', image: '/assets/img/site/matchup_bkg.webp' };
    });
    void this.data.loadIndex().catch(() => undefined);

    effect(() => {
      const slug = this.ally()?.champion.slug;
      untracked(() => this.load(slug, this.allyData));
    });
    effect(() => {
      const slug = this.enemy()?.champion.slug;
      untracked(() => this.load(slug, this.enemyData));
    });
    // New matchup: reset the form, defaulting to "no data" when there is nothing to show.
    effect(() => {
      const hasTips = !!this.matchup();
      this.ally();
      this.enemy();
      untracked(() => {
        this.requestType.set(hasTips ? 'wrong_data' : 'no_data');
        this.sendState.set('idle');
        this.message.set('');
      });
    });
  }

  protected ctxSplash(option: ChampionOption): string {
    return this.data.splashUrl(option.champion);
  }

  protected select(side: 'champion' | 'enemy', champion: Champion): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [side]: champion.slug },
      queryParamsHandling: 'merge',
    });
  }

  protected reverse(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { champion: this.enemy()?.champion.slug ?? null, enemy: this.ally()?.champion.slug ?? null },
    });
  }

  protected sendRequest(): void {
    const ally = this.ally();
    const enemy = this.enemy();
    if (!ally || !enemy || this.sendState() === 'sending') return;
    this.sendState.set('sending');
    this.email
      .sendMatchupUpdateRequest({
        type: this.requestType(),
        champion1: ally.champion.name,
        champion2: enemy.champion.name,
        message: this.message(),
        website: this.website(),
      })
      .subscribe({
        next: () => this.sendState.set('sent'),
        error: () => this.sendState.set('error'),
      });
  }

  private optionFor(slug: string | null | undefined): ChampionOption | null {
    if (!slug) return null;
    return this.options().find((o) => o.champion.slug === slug) ?? null;
  }

  private load(slug: string | undefined, target: typeof this.allyData): void {
    if (!slug) {
      target.set(undefined);
      return;
    }
    target.set(undefined);
    void this.data.loadMatchups(slug).then((data) => {
      // Ignore late answers for a previous selection.
      if (this.optionFor(slug) && (this.ally()?.champion.slug === slug || this.enemy()?.champion.slug === slug)) {
        target.set(data);
      }
    });
  }

  /** Same-role matchups of `owner` within the given levels, hardest/easiest first then by name. */
  private rows(owner: Champion, data: ChampionMatchups, levels: number[]): ListRow[] {
    return data.matchups
      .filter((m) => levels.includes(m.level))
      .map((m) => ({ m, champion: this.data.findByName(m.enemy) }))
      .filter(({ champion }) => !!champion && champion.roles.some((role) => owner.roles.includes(role)))
      .sort((a, b) => levels.indexOf(a.m.level) - levels.indexOf(b.m.level) || a.m.enemy.localeCompare(b.m.enemy))
      .map(({ m, champion }) => ({
        name: m.enemy,
        icon: champion ? this.data.iconUrl(champion) : '',
        level: m.level,
        queryParams: { champion: owner.slug, enemy: champion?.slug ?? slugify(m.enemy) },
      }));
  }
}
