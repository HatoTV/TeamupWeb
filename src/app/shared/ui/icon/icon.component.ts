import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconDefinition, IconName } from './icons';

/**
 * Inline SVG icon. Decorative by default (`aria-hidden`); pass `label` to expose it
 * to assistive technologies as an image.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-icon' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="icon().mode === 'fill' ? 'currentColor' : 'none'"
      [attr.stroke]="icon().mode === 'stroke' ? 'currentColor' : null"
      [attr.stroke-width]="icon().mode === 'stroke' ? icon().strokeWidth ?? 2 : null"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
    >
      @for (shape of icon().shapes; track $index) {
        @switch (shape.tag) {
          @case ('path') {
            <path [attr.d]="shape.d" [attr.fill]="shape.filled ? 'currentColor' : null" />
          }
          @case ('circle') {
            <circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" [attr.fill]="shape.filled ? 'currentColor' : null" />
          }
          @case ('rect') {
            <rect [attr.x]="shape.x" [attr.y]="shape.y" [attr.width]="shape.width" [attr.height]="shape.height" [attr.rx]="shape.rx ?? null" />
          }
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
        line-height: 0;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(18);
  readonly label = input<string>('');

  protected readonly icon = computed<IconDefinition>(() => ICONS[this.name()]);
}
