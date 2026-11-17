import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TierRank } from '../../core/data/build-data.service';
import { TIER_COLORS, withAlpha } from './tier-list-utils';

/**
 * Tier letter in the tier list colours: rounded tinted tile, italic display letter in the tier
 * colour. Size through `--tier-tile-*` custom properties.
 */
@Component({
  selector: 'app-tier-tile',
  standalone: true,
  template: '{{ tier() }}',
  host: { '[style.--tier]': 'color()', '[style.--tier-bg]': 'bg()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: var(--tier-tile-width, 48px);
      height: var(--tier-tile-height, 40px);
      border-radius: var(--tier-tile-radius, 10px);
      background: linear-gradient(var(--tier-bg), var(--tier-bg)), var(--color-surface);
      font: italic 800 var(--tier-tile-font, 24px) / 1 var(--font-display);
      font-stretch: var(--stretch-hero);
      color: var(--tier);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierTileComponent {
  readonly tier = input.required<TierRank>();
  protected readonly color = computed(() => TIER_COLORS[this.tier()]);
  protected readonly bg = computed(() => withAlpha(TIER_COLORS[this.tier()], 0.14));
}
