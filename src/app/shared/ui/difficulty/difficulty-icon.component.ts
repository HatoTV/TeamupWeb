import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { difficulty } from './matchup-difficulty';

/** Decorative difficulty icon (chevrons / equals sign), drawn with `currentColor`. */
@Component({
  selector: 'app-difficulty-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      [attr.stroke-width]="strokeWidth()" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class DifficultyIconComponent {
  readonly level = input.required<number>();
  readonly size = input(16);
  readonly strokeWidth = input(2.8);

  protected readonly path = computed(() => difficulty(this.level()).icon);
}
