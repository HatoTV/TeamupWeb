import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatchupDifficulty, difficulty } from './difficulty/matchup-difficulty';
import { DifficultyIconComponent } from './difficulty/difficulty-icon.component';

export type { DifficultyLevel } from './difficulty/matchup-difficulty';

/**
 * Difficulty label on a 16 % tinted background (optionally with its icon),
 * or a coloured dot (`variant="dot"`). Never relies on colour alone: the label is always there.
 */
@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  imports: [TranslateModule, DifficultyIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"diff diff--" + variant()',
    '[style.--diff-color]': 'level().color',
    '[style.--diff-text]': 'level().text',
    '[style.--diff-bg]': 'level().bg',
  },
  template: `
    @if (variant() === 'dot') {
      <span class="diff__dot" role="img" [attr.aria-label]="('UI.DIFFICULTY.LABEL' | translate) + ' : ' + (level().labelKey | translate)"></span>
    } @else {
      @if (icon()) {
        <app-difficulty-icon [level]="level().level" [size]="12" />
      }
      {{ level().labelKey | translate }}
    }
  `,
  styles: [
    `
      :host(.diff--badge) {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: var(--radius-tag);
        background: var(--diff-bg);
        color: var(--diff-text);
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
      }
      :host(.diff--dot) {
        display: inline-flex;
      }
      .diff__dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--diff-color);
        box-shadow: 0 0 0 2px var(--color-night);
      }
    `,
  ],
})
export class DifficultyBadgeComponent {
  readonly level = input.required<MatchupDifficulty, number>({ transform: (value: number) => difficulty(value) });
  readonly variant = input<'badge' | 'dot'>('badge');
  /** Shows the level icon before the label (matchup pages). */
  readonly icon = input(false);
}
