import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/** Segmented gauge (1 to `max`). Colour comes from `--meter-color` (defaults to the hub accent). */
@Component({
  selector: 'app-meter',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="meter" role="img" [attr.aria-label]="'UI.METER' | translate: { label: label(), value: value(), max: max() }">
      @for (segment of segments(); track $index) {
        <span class="meter__segment" [class.is-on]="segment"></span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .meter {
        display: flex;
        gap: 3px;
      }
      .meter__segment {
        width: var(--meter-segment, 22px);
        height: 7px;
        border-radius: 2px;
        background: var(--color-line);
      }
      .meter__segment.is-on {
        background: var(--meter-color, var(--game-accent));
      }
    `,
  ],
})
export class MeterComponent {
  readonly value = input.required<number>();
  readonly max = input(5);
  /** Already-translated name of the measured quantity (e.g. "Difficulté"). */
  readonly label = input.required<string>();

  protected readonly segments = computed(() =>
    Array.from({ length: this.max() }, (_, i) => i < Math.round(this.value()))
  );
}
