import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Lang } from '../../core/site.config';

let nextId = 0;

/** Decorative flag for a site language (FR: France, EN: United Kingdom). The link around it carries the name. */
@Component({
  selector: 'app-lang-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'flag', '[style.width.px]': 'size()', '[style.height.px]': 'size() * 2 / 3' },
  template: `
    @if (lang() === 'fr') {
      <svg viewBox="0 0 3 2" preserveAspectRatio="none" focusable="false">
        <rect width="1" height="2" fill="#002654" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ce1126" />
      </svg>
    } @else {
      <svg viewBox="0 0 60 40" preserveAspectRatio="none" focusable="false">
        <defs>
          <clipPath [attr.id]="uid + '-s'"><rect width="60" height="40" /></clipPath>
          <clipPath [attr.id]="uid + '-t'"><path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" /></clipPath>
        </defs>
        <g [attr.clip-path]="'url(#' + uid + '-s)'">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" stroke-width="8" />
          <path d="M0,0 L60,40 M60,0 L0,40" [attr.clip-path]="'url(#' + uid + '-t)'" stroke="#c8102e" stroke-width="5" />
          <path d="M30,0 v40 M0,20 h60" stroke="#fff" stroke-width="12" />
          <path d="M30,0 v40 M0,20 h60" stroke="#c8102e" stroke-width="7" />
        </g>
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
        overflow: hidden;
        border-radius: 3px;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
      }
      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class LangFlagComponent {
  readonly lang = input.required<Lang>();
  /** Width in px (height is 2/3 of it). */
  readonly size = input(21);

  protected readonly uid = `flag-${nextId++}`;
}
