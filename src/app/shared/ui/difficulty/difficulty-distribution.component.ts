import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RouteContextService } from '../../../core/route-context.service';
import { DIFFICULTY_LEVELS, DifficultyLevel, MATCHUP_DIFFICULTY, distribution } from './matchup-difficulty';

/** Horizontal stacked bar: share of each difficulty level in a list. */
@Component({
  selector: 'app-difficulty-distribution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', class: 'dist', '[attr.aria-label]': 'label()' },
  template: `@for (slice of slices(); track slice.level) {<span class="dist__part" [style.flex-grow]="slice.count" [style.background]="colors[slice.level]"></span>}`,
  styles: [
    `
      :host {
        display: flex;
        gap: 2px;
        height: 6px;
        border-radius: 999px;
        overflow: hidden;
      }
      .dist__part {
        flex: 1 1 0;
        min-width: 4px;
      }
    `,
  ],
})
export class DifficultyDistributionComponent {
  private readonly translate = inject(TranslateService);
  private readonly ctx = inject(RouteContextService);

  readonly levels = input.required<readonly number[]>();
  readonly order = input<readonly DifficultyLevel[]>(DIFFICULTY_LEVELS);

  protected readonly colors = Object.fromEntries(DIFFICULTY_LEVELS.map((l) => [l, MATCHUP_DIFFICULTY[l].color]));
  protected readonly slices = computed(() => distribution(this.levels(), this.order()));

  protected readonly label = computed(() => {
    this.ctx.lang(); // re-translate on language change
    const parts = this.slices().map(
      (s) => `${this.translate.instant(MATCHUP_DIFFICULTY[s.level].labelKey)} : ${s.count}`
    );
    return `${this.translate.instant('UI.DIFFICULTY.DISTRIBUTION')} — ${parts.join(', ')}`;
  });
}
