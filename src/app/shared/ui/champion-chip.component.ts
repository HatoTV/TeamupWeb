import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Round champion icon + name. Green border for the player's champion, red for the enemy. */
@Component({
  selector: 'app-champion-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"chip chip--" + side()' },
  template: `
    <img [src]="iconSrc()" alt="" width="30" height="30" loading="lazy" decoding="async" />
    <span class="chip__name">{{ name() }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        min-height: 44px;
        padding: 6px 12px 6px 6px;
        border-radius: var(--radius-pill);
        background: var(--color-night);
        border: 1px solid var(--color-line-strong);
        font-weight: 600;
      }
      :host(.chip--ally) {
        border-color: var(--color-ally);
      }
      :host(.chip--enemy) {
        border-color: var(--color-enemy);
      }
      img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
      }
    `,
  ],
})
export class ChampionChipComponent {
  readonly name = input.required<string>();
  readonly iconSrc = input.required<string>();
  readonly side = input<'ally' | 'enemy' | 'neutral'>('neutral');
}
