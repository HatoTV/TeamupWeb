import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DIFFICULTY_LEVELS, difficulty } from './matchup-difficulty';

/** 5-step gauge. Filled steps use the level colour (or `currentColor` with `tone="ink"`). */
@Component({
  selector: 'app-difficulty-pips',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'pips',
    '[class.pips--ink]': 'tone() === "ink"',
    '[class.pips--tall]': 'size() === "tall"',
    '[style.--pip-on]': 'tone() === "ink" ? "currentColor" : info().color',
  },
  template: `<span class="pips__inner" role="img" [attr.aria-label]="'UI.DIFFICULTY.GAUGE' | translate: { label: (info().labelKey | translate), value: info().level }">@for (step of steps; track step) {<span class="pip" [class.is-on]="step <= info().level"></span>}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .pips__inner {
        display: inline-flex;
        gap: 2px;
      }
      .pip {
        width: 10px;
        height: 4px;
        border-radius: 2px;
        background: var(--color-line);
      }
      .pip.is-on {
        background: var(--pip-on);
      }
      :host(.pips--tall) .pips__inner {
        gap: 3px;
      }
      :host(.pips--tall) .pip {
        width: 8px;
        height: 20px;
      }
      :host(.pips--ink) .pip:not(.is-on) {
        background: currentColor;
        opacity: 0.22;
      }
    `,
  ],
})
export class DifficultyPipsComponent {
  readonly level = input.required<number>();
  readonly tone = input<'level' | 'ink'>('level');
  readonly size = input<'small' | 'tall'>('small');

  protected readonly steps = DIFFICULTY_LEVELS;
  protected readonly info = computed(() => difficulty(this.level()));
}
