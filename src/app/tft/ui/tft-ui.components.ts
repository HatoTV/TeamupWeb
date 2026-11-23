import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TftChampion, TftItem, TftTrait, TraitStyle } from '../logic/tft-types';

/** CSS colour of a champion cost (1 to 5). */
export const costColor = (cost: number) => `var(--tft-cost-${Math.min(5, Math.max(1, cost))})`;

/** Item icon (title = name). */
@Component({
  selector: 'app-tft-item',
  standalone: true,
  template: `@if (item(); as i) {
    @if (i.icon) {
      <img [src]="i.icon" [alt]="decorative() ? '' : i.name" [title]="i.name" [width]="size()" [height]="size()" loading="lazy" decoding="async" />
    } @else {
      <span class="missing" [title]="i.name">{{ i.name.slice(0, 2) }}</span>
    }
  }`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    img,
    .missing {
      display: block;
      width: var(--size);
      height: var(--size);
      border-radius: var(--item-radius, 4px);
      border: 1px solid var(--color-line);
      background: var(--color-surface-plus);
      object-fit: cover;
    }
    .missing {
      display: grid;
      place-items: center;
      font-size: 10px;
      color: var(--color-text-muted);
    }
  `,
  host: { '[style.--size.px]': 'size()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftItemComponent {
  readonly item = input.required<TftItem | undefined>();
  readonly size = input(18);
  /** Inside a labelled control: no alternative text. */
  readonly decorative = input(false);
}

/** Champion portrait bordered by its cost; optional star (carry), star level and items underneath. */
@Component({
  selector: 'app-tft-champ',
  standalone: true,
  imports: [TftItemComponent],
  template: `@if (champion(); as c) {
    <span class="frame" [class.is-dim]="dim()">
      @if (c.icon) {
        <img class="portrait" [src]="c.icon" [alt]="decorative() ? '' : c.name" [width]="size()" [height]="size()" loading="lazy" decoding="async" />
      } @else {
        <span class="portrait portrait--empty">{{ c.name.slice(0, 2) }}</span>
      }
      @if (carry()) {
        <span class="carry" aria-hidden="true"><svg viewBox="0 0 24 24" width="10" height="10"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" /></svg></span>
      }
      @if (stars() > 1) {
        <span class="stars" aria-hidden="true">{{ stars() === 3 ? '★★★' : '★★' }}</span>
      }
    </span>
    @if (items().length) {
      <span class="items">
        @for (i of items(); track $index) {
          <app-tft-item [item]="i" [size]="itemSize()" [decorative]="decorative()" />
        }
      </span>
    }
    @if (label()) {
      <span class="name">{{ c.name }}</span>
    }
  }`,
  styles: `
    :host {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: var(--size);
      flex: none;
    }
    .frame {
      position: relative;
      display: block;
    }
    .portrait {
      display: block;
      width: var(--size);
      height: var(--size);
      border-radius: var(--champ-radius, 8px);
      border: 2px solid var(--cost);
      background: var(--color-surface-plus);
      object-fit: cover;
    }
    .portrait--empty {
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 700;
    }
    .is-dim .portrait {
      opacity: 0.4;
      filter: grayscale(0.6);
    }
    .carry {
      position: absolute;
      top: -5px;
      right: -5px;
      display: grid;
      place-items: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--color-gold);
      fill: var(--color-on-gold);
      box-shadow: 0 0 0 2px var(--color-night);
    }
    .stars {
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      letter-spacing: -1px;
      color: var(--star-color, var(--color-gold));
      text-shadow: 0 1px 2px var(--color-night);
      white-space: nowrap;
    }
    .items {
      display: flex;
      gap: 1px;
    }
    .name {
      max-width: calc(var(--size) + 16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }
  `,
  host: { '[style.--size.px]': 'size()', '[style.--cost]': 'cost()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftChampComponent {
  readonly champion = input.required<TftChampion | undefined>();
  readonly size = input(48);
  readonly stars = input(0);
  readonly carry = input(false);
  readonly items = input<ReadonlyArray<TftItem | undefined>>([]);
  readonly label = input(false);
  readonly dim = input(false);
  readonly decorative = input(false);
  protected readonly cost = computed(() => costColor(this.champion()?.cost ?? 1));
  protected readonly itemSize = computed(() => Math.max(12, Math.round((this.size() - 2) / 3)));
}

/** Trait hexagon coloured by the tier reached, with the unit count. */
@Component({
  selector: 'app-tft-trait',
  standalone: true,
  imports: [TranslateModule],
  template: `<span class="hex" [class]="'hex hex--' + (style() ?? 'inactive')" [title]="(trait()?.name ?? '') + ' · ' + count()">
      @if (trait()?.icon; as icon) {
        <img [src]="icon" alt="" width="16" height="16" loading="lazy" />
      }
    </span>
    @if (showCount()) {
      <span class="count">{{ count() }}</span>
    }
    <span class="sr-only">{{ trait()?.name }} {{ count() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .hex {
      display: grid;
      place-items: center;
      width: var(--hex, 24px);
      height: calc(var(--hex, 24px) * 1.1);
      clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
      background: var(--bg);
    }
    .hex img {
      width: 62%;
      height: auto;
      filter: var(--icon-filter, none);
    }
    .hex--bronze {
      --bg: var(--tft-trait-bronze);
    }
    .hex--silver {
      --bg: var(--tft-trait-silver);
    }
    .hex--gold {
      --bg: var(--tft-trait-gold);
      --icon-filter: brightness(0.15);
    }
    .hex--unique {
      --bg: var(--tft-trait-unique);
      --icon-filter: brightness(0.15);
    }
    .hex--prismatic {
      --bg: var(--tft-trait-prismatic);
      --icon-filter: brightness(0.15);
    }
    .hex--inactive {
      --bg: var(--tft-trait-inactive);
      --icon-filter: opacity(0.6);
    }
    .count {
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TftTraitComponent {
  readonly trait = input.required<TftTrait | undefined>();
  readonly count = input(0);
  readonly style = input<TraitStyle | null>(null);
  readonly showCount = input(true);
}
