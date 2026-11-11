import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';

/** Numbered steps. Items are trusted i18n strings (may contain inline markup). */
@Component({
  selector: 'app-step-list',
  standalone: true,
  imports: [SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="steps">
      @for (step of steps(); track $index; let i = $index) {
        <li class="steps__item">
          <span class="steps__n" aria-hidden="true">{{ i + 1 }}</span>
          <span class="steps__text" [innerHTML]="step | safeHtml"></span>
        </li>
      }
    </ol>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .steps {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .steps__item {
        display: flex;
        gap: 14px;
        padding: 14px 16px;
        border-radius: var(--radius-control);
        background: var(--color-surface);
        border: 1px solid var(--color-line);
      }
      .steps__n {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 7px;
        background: var(--color-surface-active);
        color: var(--color-gold);
        font: 700 16px var(--font-display);
      }
      .steps__text {
        min-width: 0;
        font-size: 16px;
        line-height: 1.6;
        color: var(--color-text-guide);
      }
    `,
  ],
})
export class StepListComponent {
  readonly steps = input<string[]>([]);
}
