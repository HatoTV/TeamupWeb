import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';

/** Two-column pros / cons lists. Items are trusted i18n strings (may contain inline markup). */
@Component({
  selector: 'app-pros-cons',
  standalone: true,
  imports: [TranslateModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pc__col pc__col--pros">
      <p class="pc__title">{{ 'UI.PROS' | translate }}</p>
      <ul>
        @for (item of pros(); track $index) {
          <li [innerHTML]="item | safeHtml"></li>
        }
      </ul>
    </div>
    <div class="pc__col pc__col--cons">
      <p class="pc__title">{{ 'UI.CONS' | translate }}</p>
      <ul>
        @for (item of cons(); track $index) {
          <li [innerHTML]="item | safeHtml"></li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      @media (max-width: 600px) {
        :host {
          grid-template-columns: 1fr;
        }
      }
      .pc__col {
        padding: 18px;
        border-radius: 12px;
      }
      .pc__col--pros {
        background: rgba(79, 209, 139, 0.07);
        border: 1px solid rgba(79, 209, 139, 0.35);
      }
      .pc__col--cons {
        background: rgba(255, 79, 109, 0.07);
        border: 1px solid rgba(255, 79, 109, 0.35);
      }
      .pc__title {
        margin-bottom: 8px;
        font-family: var(--font-display);
        font-stretch: var(--stretch-heading);
        font-weight: 700;
        font-size: 20px;
        text-transform: uppercase;
      }
      .pc__col--pros .pc__title {
        color: var(--diff-2-text);
      }
      .pc__col--cons .pc__title {
        color: var(--diff-5-text);
      }
      ul {
        margin: 0;
        padding-left: 18px;
        font-size: 15px;
        line-height: 1.6;
        color: var(--color-text-guide);
      }
      li + li {
        margin-top: 6px;
      }
    `,
  ],
})
export class ProsConsComponent {
  readonly pros = input<string[]>([]);
  readonly cons = input<string[]>([]);
}
