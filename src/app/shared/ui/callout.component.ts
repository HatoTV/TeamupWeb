import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from './icon/icon.component';
import { IconName } from './icon/icons';

export type CalloutVariant = 'remember' | 'bonus' | 'tip';

const CONFIG: Record<CalloutVariant, { labelKey: string; icon: IconName }> = {
  remember: { labelKey: 'UI.CALLOUT.REMEMBER', icon: 'info' },
  bonus: { labelKey: 'UI.CALLOUT.BONUS', icon: 'bulb' },
  tip: { labelKey: 'UI.CALLOUT.TIP', icon: 'check' },
};

/** Highlighted note inside guides: « À retenir », « Info bonus », « Astuce ». */
@Component({
  selector: 'app-callout',
  standalone: true,
  imports: [TranslateModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'note', '[class]': '"callout callout--" + variant()' },
  template: `
    <app-icon class="callout__icon" [name]="config().icon" [size]="22" />
    <div class="callout__body">
      <strong class="callout__label">{{ config().labelKey | translate }}</strong>
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        --callout-color: var(--game-accent);
        display: flex;
        gap: 12px;
        margin: 14px 0 0;
        padding: 16px 18px;
        border-radius: var(--radius-control);
        background: color-mix(in srgb, var(--callout-color) 9%, transparent);
        border: 1px solid color-mix(in srgb, var(--callout-color) 38%, transparent);
        font-size: 17px;
        line-height: 1.65;
        color: #e2e2ee;
      }
      :host(.callout--bonus) {
        --callout-color: var(--color-gold);
      }
      :host(.callout--tip) {
        --callout-color: var(--color-ally);
      }
      .callout__icon {
        margin-top: 2px;
        color: var(--callout-color);
      }
      .callout__label {
        margin-right: 0.3em;
        color: color-mix(in srgb, var(--callout-color) 55%, #fff);
      }
      :host(.callout--bonus) .callout__label {
        color: var(--color-gold);
      }
      .callout__body {
        min-width: 0;
      }
    `,
  ],
})
export class CalloutComponent {
  readonly variant = input<CalloutVariant>('remember');
  protected readonly config = computed(() => CONFIG[this.variant()]);
}
