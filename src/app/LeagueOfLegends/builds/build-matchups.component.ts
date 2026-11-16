import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface MatchupCard {
  title: string;
  tone: 'bad' | 'good' | 'duo';
  items: Array<{ key: number; name: string; icon: string; winRate: string; link: string[] | null }>;
}

/** Bottom of the build page: weak / strong against, best duo, link to the Matchups tool. */
@Component({
  selector: 'app-build-matchups',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (group of groups(); track group.title) {
      <div class="mu" [class]="'mu mu--' + group.tone">
        <h2 class="mu__title">{{ group.title | translate }}</h2>
        <ul class="mu__grid">
          @for (o of group.items; track o.key) {
            <li>
              @if (o.link) {
                <a class="mu__item" [routerLink]="o.link">
                  <img [src]="o.icon" alt="" width="44" height="44" loading="lazy" />
                  <span class="mu__name">{{ o.name }}</span>
                  <span class="mu__wr">{{ o.winRate }}</span>
                </a>
              }
            </li>
          } @empty {
            <li class="mu__empty">{{ 'BUILDS.NOT_ENOUGH' | translate }}</li>
          }
        </ul>
      </div>
    }
    <a class="cta" [routerLink]="matchupsLink()">
      <span class="cta__kicker">{{ 'BUILDS.EXCLUSIVE' | translate }}</span>
      <span class="cta__title">{{ 'BUILDS.MATCHUP_TIPS' | translate }}</span>
      <span class="cta__text">{{ 'BUILDS.MATCHUP_TIPS_TEXT' | translate: { champion: champion() } }}</span>
    </a>
  `,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }
      .mu {
        --mu: var(--diff-2-text);
        overflow: hidden;
        border-radius: var(--radius-card);
        background: var(--color-surface);
        border: 1px solid var(--color-line);
      }
      .mu--bad {
        --mu: var(--diff-5-text);
      }
      .mu--duo {
        --mu: var(--diff-3-text);
      }
      .mu__title {
        padding: 14px 16px;
        border-bottom: 1px solid var(--color-separator);
        box-shadow: inset 0 3px 0 var(--mu);
        font: 700 17px var(--font-display);
        font-stretch: var(--stretch-heading);
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .mu__grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin: 0;
        padding: 14px;
        list-style: none;
      }
      .mu__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 4px;
        border-radius: 10px;
      }
      .mu__item:hover {
        background: var(--color-surface-plus);
      }
      .mu__item img {
        border-radius: 10px;
      }
      .mu__name {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        text-align: center;
      }
      .mu__wr {
        font: 700 16px var(--font-numeric);
        font-stretch: 100%;
        font-variant-numeric: tabular-nums;
        color: var(--mu);
      }
      .mu__empty {
        grid-column: 1 / -1;
        font-size: 13px;
        color: var(--color-text-subtle);
      }
      .cta {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
        padding: 22px;
        border-radius: var(--radius-card);
        background: linear-gradient(135deg, rgba(155, 123, 255, 0.18), var(--color-surface) 60%);
        border: 1px solid #9b7bff;
      }
      .cta__kicker {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-stretch: var(--stretch-heading);
        color: #c3b0ff;
      }
      .cta__title {
        font: 700 24px/1.05 var(--font-display);
        font-stretch: var(--stretch-heading);
        text-transform: uppercase;
      }
      @media (max-width: 767px) {
        .cta__title {
          font-size: 21px;
        }
      }
      .cta__text {
        font-size: 14px;
        color: var(--color-text-secondary);
      }
    `,
  ],
})
export class BuildMatchupsComponent {
  readonly groups = input.required<MatchupCard[]>();
  readonly champion = input.required<string>();
  readonly matchupsLink = input.required<string>();
}
