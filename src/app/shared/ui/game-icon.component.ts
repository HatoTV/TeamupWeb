import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

let nextId = 0;

/**
 * Game icon (item, rune, spell…) with an accessible tooltip: name, cost and description.
 * Focusable when it has a tooltip, so keyboard users get the same information on focus.
 */
@Component({
  selector: 'app-game-icon',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gi',
    '[class.gi--round]': 'shape() === "round"',
    '[class.gi--dim]': 'dim()',
    '[style.--gi-size.px]': 'size()',
    '[style.--gi-ring]': 'ring() ?? "transparent"',
  },
  template: `
    <span
      class="gi__box"
      [attr.tabindex]="hasTip() ? 0 : null"
      [attr.aria-describedby]="hasTip() ? tipId : null"
      [attr.role]="hasTip() ? 'img' : null"
      [attr.aria-label]="hasTip() ? name() : null"
    >
      <img [src]="src()" [attr.alt]="hasTip() ? '' : name()" [width]="size()" [height]="size()" loading="lazy" decoding="async" />
      @if (badge()) {
        <span class="gi__badge" aria-hidden="true">{{ badge() }}</span>
      }
    </span>
    @if (hasTip()) {
      <span class="gi__tip" role="tooltip" [id]="tipId">
        <strong class="gi__name">{{ name() }}</strong>
        @if (cost()) {
          <span class="gi__cost">{{ 'BUILDS.COST' | translate: { cost: cost() } }}</span>
        }
        @if (desc()) {
          <span class="gi__desc">{{ desc() }}</span>
        }
      </span>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-flex;
        flex: none;
      }
      .gi__box {
        position: relative;
        display: block;
        width: var(--gi-size);
        height: var(--gi-size);
        border-radius: 7px;
        box-shadow: 0 0 0 2px var(--gi-ring);
        outline-offset: 2px;
      }
      :host(.gi--round) .gi__box {
        border-radius: 50%;
      }
      img {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: var(--color-night);
        border: 1px solid var(--color-line-strong);
      }
      :host(.gi--round) img {
        border: 0;
      }
      :host(.gi--dim) img {
        opacity: 0.3;
        filter: grayscale(1);
      }
      .gi__badge {
        position: absolute;
        right: 2px;
        bottom: 0;
        padding: 0 3px;
        border-radius: 4px;
        background: rgba(13, 13, 24, 0.85);
        font: 700 12px var(--font-display);
        color: var(--gi-badge, var(--color-text));
      }
      .gi__tip {
        position: absolute;
        z-index: 30;
        left: 50%;
        bottom: calc(100% + 8px);
        width: max-content;
        max-width: 280px;
        padding: 10px 12px;
        border-radius: var(--radius-control);
        background: #0b0b15;
        border: 1px solid var(--color-line-strong);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        font-size: 13px;
        line-height: 1.45;
        text-align: left;
        white-space: pre-line;
        opacity: 0;
        visibility: hidden;
        transform: translate(-50%, 4px);
        transition:
          opacity var(--duration-color) ease,
          transform var(--duration-color) ease,
          visibility 0s linear var(--duration-color);
        pointer-events: none;
      }
      :host(:hover) .gi__tip,
      :host(:focus-within) .gi__tip {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0);
        transition-delay: 0s;
      }
      .gi__name {
        display: block;
        font-weight: 700;
        color: var(--color-text);
      }
      .gi__cost {
        display: block;
        margin-top: 2px;
        color: var(--color-gold);
        font-weight: 600;
      }
      .gi__desc {
        display: block;
        margin-top: 4px;
        color: var(--color-text-secondary);
      }
      @media (prefers-reduced-motion: reduce) {
        .gi__tip {
          transition: none;
        }
      }
    `,
  ],
})
export class GameIconComponent {
  readonly src = input.required<string>();
  readonly name = input.required<string>();
  readonly desc = input<string | null>(null);
  readonly cost = input<number | null>(null);
  readonly size = input(40);
  readonly shape = input<'square' | 'round'>('square');
  readonly dim = input(false);
  readonly ring = input<string | null>(null);
  readonly badge = input<string | null>(null);
  /** Disable the tooltip (decorative repeats). */
  readonly tooltip = input(true);

  protected readonly tipId = `gi-tip-${nextId++}`;
  protected readonly hasTip = computed(() => this.tooltip() && !!this.name());
}
