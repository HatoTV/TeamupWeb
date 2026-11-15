import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ImgFallbackPipe, SrcsetPipe } from '../../core/images/image-utils';
import { Champion, ROLES, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { ChampionComboboxComponent, ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { DifficultyIconComponent } from '../../shared/ui/difficulty/difficulty-icon.component';
import { DIFFICULTY_LEVELS, MATCHUP_DIFFICULTY } from '../../shared/ui/difficulty/matchup-difficulty';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { pickableChampions } from './matchups-data';
import { injectMatchupNavigation, matchupPath } from './matchups-url';

/** Nothing selected: big "step 1 / step 2" slots, champion grid with role filter, how-to and legend. */
@Component({
  selector: 'app-matchups-empty',
  standalone: true,
  imports: [TranslateModule, RouterLink, SrcsetPipe, ImgFallbackPipe, ChampionComboboxComponent, DifficultyIconComponent, IconComponent],
  templateUrl: './matchups-empty.component.html',
  styleUrl: './matchups-empty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupsEmptyComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly navigate = injectMatchupNavigation();

  readonly options = input.required<ChampionOption[]>();

  protected readonly roles = ROLES;
  protected readonly role = signal<Role | null>(null);
  protected readonly scale = DIFFICULTY_LEVELS.map((l) => MATCHUP_DIFFICULTY[l]);
  protected readonly steps = [
    { n: 1, tone: 'ally' },
    { n: 2, tone: 'enemy' },
    { n: 3, tone: 'gold' },
  ] as const;

  private readonly combo = viewChild.required(ChampionComboboxComponent);
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  protected readonly pickable = this.options;
  protected readonly champions = computed(() => {
    const allowed = new Set(pickableChampions(this.pickable().map((o) => o.champion), this.role()).map((c) => c.slug));
    return this.pickable().filter((o) => allowed.has(o.champion.slug));
  });
  /** Roving tab stop of the grid (one Tab stop, arrows move inside). */
  protected readonly activeIndex = signal(0);

  constructor() {
    effect(() => {
      this.champions();
      untracked(() => this.activeIndex.set(0));
    });
  }

  protected link(champion: Champion): string {
    return this.ctx.link(matchupPath({ me: champion.slug, vs: null }));
  }

  protected pick(champion: Champion): void {
    this.navigate({ me: champion.slug, vs: null });
  }

  protected focusSearch(): void {
    this.combo().focus();
  }

  protected toggleRole(role: Role | null): void {
    this.role.set(this.role() === role ? null : role);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const grid = this.grid()?.nativeElement;
    if (!grid) return;
    const count = this.champions().length;
    const columns = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
    const current = this.activeIndex();
    const next: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current + columns,
      ArrowUp: current - columns,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    const index = Math.min(count - 1, Math.max(0, next[event.key]));
    this.activeIndex.set(index);
    grid.querySelectorAll<HTMLElement>('a')[index]?.focus();
  }
}
