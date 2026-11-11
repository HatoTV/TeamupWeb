import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Champion, ChampionDataService, ChampionMatchups } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { FEATURES } from '../../core/site.config';
import { ChampionComboboxComponent, ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { DifficultyIconComponent } from '../../shared/ui/difficulty/difficulty-icon.component';
import { DifficultyLevel, MATCHUP_DIFFICULTY } from '../../shared/ui/difficulty/matchup-difficulty';
import { MatchupReportComponent } from './matchup-report.component';
import { boardColumns, injectIsMobile, optionsWithLevels } from './matchups-data';
import { MatchupSelection, injectMatchupNavigation, matchupPath } from './matchups-url';

/**
 * One champion chosen. `side="me"`: my champion is known, "who do you play against?".
 * `side="vs"`: only the enemy is known, "who counters it best?" (levels seen from the enemy).
 */
@Component({
  selector: 'app-matchups-one',
  standalone: true,
  imports: [TranslateModule, RouterLink, ChampionComboboxComponent, DifficultyIconComponent, MatchupReportComponent],
  templateUrl: './matchups-one.component.html',
  styleUrl: './matchups-one.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupsOneComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(ChampionDataService);
  private readonly navigate = injectMatchupNavigation();
  protected readonly mobile = injectIsMobile();

  readonly side = input.required<'me' | 'vs'>();
  readonly owner = input.required<ChampionOption>();
  /** Matchup file of the owner (undefined while loading, null when missing). */
  readonly ownerData = input<ChampionMatchups | null | undefined>(undefined, { alias: 'data' });
  readonly options = input.required<ChampionOption[]>();

  protected readonly showBuild = FEATURES.buildPages;
  protected readonly reportOpen = signal(false);
  /** Mobile only: which level sections are expanded. */
  protected readonly expanded = signal<ReadonlySet<DifficultyLevel>>(new Set());

  protected readonly splash = computed(() => this.data.splashUrl(this.owner().champion));
  protected readonly columns = computed(() =>
    boardColumns(this.ownerData(), this.data).map((col) => ({ ...col, info: MATCHUP_DIFFICULTY[col.level] }))
  );
  protected readonly classifiedCount = computed(() => this.columns().reduce((n, c) => n + c.entries.length, 0));
  protected readonly suggestions = computed(() => optionsWithLevels(this.options(), this.ownerData(), this.owner().champion.slug));
  protected readonly reportChampion1 = computed(() => (this.side() === 'me' ? this.owner().champion : null));
  protected readonly reportChampion2 = computed(() => (this.side() === 'vs' ? this.owner().champion : null));

  constructor() {
    // Mobile: the hardest non-empty level is open by default.
    effect(() => {
      const first = this.columns().find((c) => c.entries.length)?.level;
      untracked(() => this.expanded.set(new Set(first ? [first] : [])));
    });
    effect(() => {
      this.owner();
      untracked(() => this.reportOpen.set(false));
    });
  }

  protected selection(other: string): MatchupSelection {
    const owner = this.owner().champion.slug;
    return this.side() === 'me' ? { me: owner, vs: other } : { me: other, vs: owner };
  }

  protected link(other: string): string {
    return this.ctx.link(matchupPath(this.selection(other)));
  }

  protected pick(champion: Champion): void {
    this.navigate(this.selection(champion.slug));
  }

  protected change(): void {
    this.navigate({ me: null, vs: null });
  }

  protected isOpen(level: DifficultyLevel): boolean {
    return !this.mobile() || this.expanded().has(level);
  }

  protected toggle(level: DifficultyLevel): void {
    if (!this.mobile()) return; // columns are always open on desktop
    const next = new Set(this.expanded());
    if (next.has(level)) next.delete(level);
    else next.add(level);
    this.expanded.set(next);
  }
}
