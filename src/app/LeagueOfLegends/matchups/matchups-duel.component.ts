import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Champion, ChampionDataService, ChampionMatchups } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { FEATURES } from '../../core/site.config';
import { ChampionComboboxComponent, ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { DifficultyBadgeComponent } from '../../shared/ui/difficulty-badge.component';
import { DifficultyDistributionComponent } from '../../shared/ui/difficulty/difficulty-distribution.component';
import { DifficultyIconComponent } from '../../shared/ui/difficulty/difficulty-icon.component';
import { DifficultyPipsComponent } from '../../shared/ui/difficulty/difficulty-pips.component';
import { DifficultyVerdictComponent } from '../../shared/ui/difficulty/difficulty-verdict.component';
import { difficulty } from '../../shared/ui/difficulty/matchup-difficulty';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { CommunityTipsComponent } from './community-tips/community-tips.component';
import { MatchupReportComponent } from './matchup-report.component';
import { MatchupEntry, listEntries, optionsWithLevels, rankId, splitTips } from './matchups-data';
import { injectMatchupNavigation, matchupPath } from './matchups-url';

interface MatchupList {
  id: string;
  kind: 'favourable' | 'counters';
  owner: ChampionOption;
  /** Rows link to `owner` vs row. */
  rows: Array<MatchupEntry & { link: string; info: ReturnType<typeof difficulty> }>;
}

/** Both champions chosen: verdict, tips, update form and the four counter / favourable lists. */
@Component({
  selector: 'app-matchups-duel',
  standalone: true,
  imports: [
    TranslateModule,
    RouterLink,
    NgOptimizedImage,
    ChampionComboboxComponent,
    CommunityTipsComponent,
    DifficultyBadgeComponent,
    DifficultyDistributionComponent,
    DifficultyIconComponent,
    DifficultyPipsComponent,
    DifficultyVerdictComponent,
    IconComponent,
    MatchupReportComponent,
  ],
  templateUrl: './matchups-duel.component.html',
  styleUrl: './matchups-duel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupsDuelComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(ChampionDataService);
  private readonly navigate = injectMatchupNavigation();

  readonly me = input.required<ChampionOption>();
  readonly vs = input.required<ChampionOption>();
  readonly meData = input<ChampionMatchups | null | undefined>(undefined);
  readonly vsData = input<ChampionMatchups | null | undefined>(undefined);
  readonly options = input.required<ChampionOption[]>();

  protected readonly showBuild = FEATURES.buildPages;
  protected readonly loading = computed(() => this.meData() === undefined);

  protected readonly matchup = computed(() => this.meData()?.matchups.find((m) => m.enemy === this.vs().champion.name) ?? null);
  protected readonly info = computed(() => {
    const m = this.matchup();
    return m ? difficulty(m.level) : null;
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
    const data = this.meData();
    if (!data?.author) return null;
    return { name: data.author, rank: rankId(data.rank) };
  });

  protected readonly meOptions = computed(() => optionsWithLevels(this.options(), this.vsData()));
  protected readonly vsOptions = computed(() => optionsWithLevels(this.options(), this.meData()));

  protected readonly lists = computed<MatchupList[]>(() => {
    const result: MatchupList[] = [];
    for (const [owner, data] of [
      [this.me(), this.meData()],
      [this.vs(), this.vsData()],
    ] as const) {
      if (!data) continue;
      const rows = (levels: number[]) =>
        listEntries(owner.champion, data, levels, this.data).map((e) => ({
          ...e,
          info: difficulty(e.level),
          link: this.ctx.link(matchupPath({ me: owner.champion.slug, vs: e.slug })),
        }));
      result.push(
        { id: `${owner.champion.slug}-favourable`, kind: 'favourable', owner, rows: rows([1, 2]) },
        { id: `${owner.champion.slug}-counters`, kind: 'counters', owner, rows: rows([5, 4]) }
      );
    }
    return result;
  });

  protected splash(option: ChampionOption): string {
    return this.data.splashUrl(option.champion);
  }

  protected levelsOf(list: MatchupList): number[] {
    return list.rows.map((r) => r.level);
  }

  protected select(side: 'me' | 'vs', champion: Champion): void {
    const me = side === 'me' ? champion.slug : this.me().champion.slug;
    const vs = side === 'vs' ? champion.slug : this.vs().champion.slug;
    this.navigate(me === vs ? { me, vs: null } : { me, vs });
  }

  protected reverse(): void {
    this.navigate({ me: this.vs().champion.slug, vs: this.me().champion.slug });
  }
}
