import { ImgFallbackPipe, SrcsetPipe } from '../../../core/images/image-utils';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface Crumb {
  label: string;
  /** Absolute router link; omitted for the current page. */
  link?: string;
}

export interface HeroTag {
  label: string;
  accent?: boolean;
}

/** Page header: background art under a night gradient, breadcrumb, h1, subtitle, tags, projected actions. */
@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [SrcsetPipe, ImgFallbackPipe, RouterLink, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-hero.component.html',
  styleUrl: './page-hero.component.scss',
})
export class PageHeroComponent {
  readonly image = input<string>('');
  readonly imagePosition = input('center');
  readonly breadcrumbs = input<Crumb[]>([]);
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly tags = input<HeroTag[]>([]);
}
