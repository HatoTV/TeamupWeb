import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteContextService } from '../core/route-context.service';
import { injectPageSeo } from '../core/seo.service';
import { PageHeroComponent } from '../shared/ui/page-hero/page-hero.component';

/** Fallback page for unknown URLs: kept out of search indexes. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [PageHeroComponent, RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-hero
      image="assets/img/splash/Blitzcrank.webp"
      imagePosition="right 20%"
      [title]="'NOTFOUND.TITLE' | translate"
      [subtitle]="'NOTFOUND.TEXT' | translate"
      [tags]="[{ label: '404', accent: true }]"
    >
      <div class="actions">
        <a class="btn btn--primary" [routerLink]="ctx.link('/home')">{{ 'NOTFOUND.HOME' | translate }}</a>
        <a class="btn btn--secondary" [routerLink]="ctx.link('/lol/matchups')">{{ 'NOTFOUND.MATCHUPS' | translate }}</a>
      </div>
    </app-page-hero>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 28px;
    }
  `,
})
export class NotFoundComponent {
  protected readonly ctx = inject(RouteContextService);

  constructor() {
    injectPageSeo(() => ({ titleKey: 'NOTFOUND.TITLE', descriptionKey: 'NOTFOUND.TEXT' }));
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex' });
    inject(DestroyRef).onDestroy(() => meta.removeTag('name="robots"'));
  }
}
