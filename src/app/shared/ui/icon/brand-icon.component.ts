import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BRAND_ICONS, BrandName } from './brand-icons';

/** Social network logo (decorative: the surrounding link carries the accessible name). */
@Component({
  selector: 'app-brand-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: [':host { display: inline-flex; flex: none; line-height: 0; }'],
})
export class BrandIconComponent {
  readonly name = input.required<BrandName>();
  readonly size = input<number>(20);
  protected readonly path = computed(() => BRAND_ICONS[this.name()]);
}
