import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DIFFICULTY_LEVELS, MATCHUP_DIFFICULTY, difficulty } from './matchup-difficulty';
import { DifficultyIconComponent } from './difficulty-icon.component';
import { DifficultyPipsComponent } from './difficulty-pips.component';

/**
 * Matchup verdict: large filled pill + 5-step scale + generic advice (desktop),
 * collapsed into a single filled bar with a 5-step gauge under 768 px.
 */
@Component({
  selector: 'app-difficulty-verdict',
  standalone: true,
  imports: [TranslateModule, DifficultyIconComponent, DifficultyPipsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'verdict',
    '[style.--v-color]': 'info().color',
    '[style.--v-glow]': 'info().glow',
  },
  template: `
    <div class="verdict__pill" role="img" [attr.aria-label]="'UI.DIFFICULTY.ARIA' | translate: { champion: champion(), label: (info().labelKey | translate), value: info().level }">
      <span class="verdict__icon"><app-difficulty-icon [level]="info().level" [size]="26" [strokeWidth]="2.6" /></span>
      <span class="verdict__text">
        <span class="verdict__for">{{ 'UI.DIFFICULTY.FOR' | translate: { champion: champion() } }}</span>
        <span class="verdict__level">{{ info().labelKey | translate }}</span>
      </span>
      <app-difficulty-pips class="verdict__pips" [level]="info().level" tone="ink" size="tall" aria-hidden="true" />
    </div>
    <ol class="verdict__scale" aria-hidden="true">
      @for (step of scale; track step.level) {
        <li class="verdict__step" [class.is-current]="step.level === info().level" [style.--s-color]="step.color">
          <span class="verdict__bar"></span>
          <span class="verdict__step-label">{{ step.labelKey | translate }}</span>
        </li>
      }
    </ol>
    <p class="verdict__advice">{{ info().adviceKey | translate }}</p>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        text-align: center;
      }
      .verdict__pill {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 26px 10px 10px;
        border-radius: 999px;
        background: var(--v-color);
        color: #120a12;
        box-shadow: 0 10px 40px var(--v-glow);
        text-align: left;
      }
      .verdict__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(18, 10, 18, 0.16);
      }
      .verdict__text {
        display: flex;
        flex-direction: column;
      }
      .verdict__for {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-stretch: var(--stretch-heading);
        opacity: 0.75;
      }
      .verdict__level {
        font: italic 700 38px/0.95 var(--font-display);
        font-stretch: var(--stretch-heading);
        text-transform: uppercase;
      }
      .verdict__pips {
        display: none;
      }
      .verdict__scale {
        display: flex;
        align-items: flex-end;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .verdict__step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 86px;
      }
      .verdict__bar {
        width: 100%;
        height: 8px;
        border-radius: 4px;
        background: var(--s-color);
        opacity: 0.28;
      }
      .verdict__step-label {
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        color: #7f7f99;
      }
      .is-current .verdict__bar {
        height: 14px;
        opacity: 1;
      }
      .is-current .verdict__step-label {
        font-weight: 700;
        color: #fff;
      }
      .verdict__advice {
        max-width: 56ch;
        font-size: 15px;
        color: #e2e2ee;
      }
      @media (max-width: 767px) {
        :host {
          align-items: stretch;
        }
        .verdict__pill {
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-card);
          box-shadow: 0 8px 30px var(--v-glow);
        }
        .verdict__icon {
          width: 36px;
          height: 36px;
        }
        .verdict__text {
          flex: 1;
        }
        .verdict__for {
          font-size: 11px;
          letter-spacing: 0.12em;
        }
        .verdict__level {
          font-size: 28px;
        }
        .verdict__pips {
          display: inline-flex;
        }
        .verdict__scale {
          display: none;
        }
        .verdict__advice {
          font-size: 14px;
          text-align: left;
        }
      }
    `,
  ],
})
export class DifficultyVerdictComponent {
  readonly level = input.required<number>();
  /** Champion the difficulty belongs to (already a display name). */
  readonly champion = input.required<string>();

  protected readonly info = computed(() => difficulty(this.level()));
  protected readonly scale = DIFFICULTY_LEVELS.map((l) => MATCHUP_DIFFICULTY[l]);
}
