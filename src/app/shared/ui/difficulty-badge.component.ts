import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/** Difficulty label on a 16 % tinted background, or a coloured dot (`variant="dot"`). */
@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"diff diff--" + variant()',
    '[style.--diff-color]': '"var(--diff-" + safeLevel() + ")"',
    '[style.--diff-text]': '"var(--diff-" + safeLevel() + "-text)"',
    '[style.--diff-bg]': '"var(--diff-" + safeLevel() + "-bg)"',
  },
  template: `
    @if (variant() === 'dot') {
      <span class="diff__dot" role="img" [attr.aria-label]="('UI.DIFFICULTY.LABEL' | translate) + ' : ' + (labelKey() | translate)"></span>
    } @else {
      {{ labelKey() | translate }}
    }
  `,
  styles: [
    `
      :host(.diff--badge) {
        display: inline-flex;
        align-items: center;
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
  readonly level = input.required<number>();
  readonly variant = input<'badge' | 'dot'>('badge');

  protected readonly safeLevel = computed<DifficultyLevel>(
    () => Math.min(5, Math.max(1, Math.round(this.level() || 1))) as DifficultyLevel
  );
  protected readonly labelKey = computed(() => `UI.DIFFICULTY.${this.safeLevel()}`);
}
