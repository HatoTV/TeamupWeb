import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { LeadPipe } from './guide-text';

/** Cards built from "<bold>Title :</bold> text" translation keys (styles: .guide-prose .info-card). */
@Component({
  selector: 'app-guide-cards',
  standalone: true,
  imports: [TranslateModule, SafeHtmlPipe, LeadPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="cards" [class.cards--list]="layout() === 'list'">
      @for (key of keys(); track key) {
        @let item = key | translate | lead;
        <li class="info-card">
          @if (item.label) {
            <p class="info-card__title">{{ item.label }}</p>
          }
          <p class="info-card__text" [innerHTML]="item.body | safeHtml"></p>
        </li>
      }
    </ul>
  `,
  styles: [':host { display: block; }'],
})
export class GuideCardsComponent {
  readonly keys = input.required<string[]>();
  /** `grid` for short texts, `list` (one per row) for long ones. */
  readonly layout = input<'grid' | 'list'>('list');
}

/** Bullet list of translation keys (inline markup allowed). */
@Component({
  selector: 'app-guide-bullets',
  standalone: true,
  imports: [TranslateModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bullets">
      @for (key of keys(); track key) {
        <li [innerHTML]="key | translate | safeHtml"></li>
      }
    </ul>
  `,
  styles: [':host { display: block; }'],
})
export class GuideBulletsComponent {
  readonly keys = input.required<string[]>();
}

/** Builds `${prefix}${i}` keys, e.g. keys('LOL.LANING.CONTENT4.LIST', 1, 5). */
export function keys(prefix: string, from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);
}
